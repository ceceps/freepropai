import fs from 'fs';
import path from 'path';
import axios from 'axios';
import llmClient from '../utils/llmClient';
import { llmConfig } from '../config/llm';
import type { ListingWithDetails } from '../types';

export interface StoryboardFormOptions {
  video_style?: string;
  ai_video_model?: string;
  aspect_ratio?: string;
  resolution?: string;
  voice_over?: boolean;
  gender?: string;
  language?: string;
  age_range?: string;
  model_reference_available?: boolean;
  video_json?: any;
  portrait_photo_url?: string | null;
  fullbody_photo_url?: string | null;
  generate_images?: boolean;
}

export interface StoryboardSceneOutput {
  scene_no: number;
  photo_id: string | null;
  crop_hint: 'wide' | 'close-up' | 'left' | 'right' | 'top-down' | null;
  needs_aerial_simulation: boolean;
  model_present: boolean;
  model_action: string | null;
  model_position: string | null;
  vo_text: string | null;
  overlay_text: string | null;
  camera_motion: string;
  duration_sec: number;
  visual_note: string;
  frame_prompt: string;
  warning: string | null;
  generated_image_url?: string | null;
}

export interface StoryboardSheetOutput {
  sheet_no: number;
  scenes: StoryboardSceneOutput[];
}

export interface StoryboardPlannerResult {
  meta: {
    listing_title: string;
    location: string;
    video_style: string;
    aspect_ratio: string;
    resolution: string;
    voice_over: boolean;
    gender: string;
    age_range: string;
    language: string;
    total_duration_sec: number;
    total_scenes: number;
    columns: string[];
  };
  sheets: StoryboardSheetOutput[];
  warnings: string[];
  error?: string;
  message?: string;
}

class StoryboardPlannerService {
  /**
   * Plan storyboard for a real estate listing
   */
  async planStoryboard(
    listing: ListingWithDetails,
    options: StoryboardFormOptions = {}
  ): Promise<StoryboardPlannerResult> {
    const videoStyle = options.video_style || 'Cinematic';
    const aiVideoModel = options.ai_video_model || 'Google Veo 3 / Omni Flash';
    const aspectRatio = options.aspect_ratio || '9:16';
    const resolution = options.resolution || '1080x1920';
    const voiceOver = options.voice_over ?? true;
    const gender = options.gender || 'Wanita';
    const language = options.language || 'Bahasa Indonesia';
    const ageRange = options.age_range || '30-45';
    const modelRefAvailable = options.model_reference_available ?? false;

    // Photos JSON
    const photos = (listing.photos || []).map((p, idx) => ({
      photo_id: p.id || `photo_${idx + 1}`,
      room_type: (p as any).tag || (p as any).label || (idx === 0 ? 'fasad' : 'interior'),
      url: p.photo_url,
    }));

    // Video JSON input (or fallback if empty)
    const videoJson = options.video_json || this.generateDefaultVideoJson(listing);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt({
      video_style: videoStyle,
      ai_video_model: aiVideoModel,
      aspect_ratio: aspectRatio,
      resolution,
      voice_over: voiceOver,
      gender,
      language,
      age_range: ageRange,
      model_reference_available: modelRefAvailable,
      listing_title: listing.title || 'Properti',
      listing_location: listing.location || 'Bandung',
      property_type: listing.property_type || 'rumah',
      photos_json: JSON.stringify(photos, null, 2),
      video_json: JSON.stringify(videoJson, null, 2),
    });

    let finalResult: StoryboardPlannerResult;

    try {
      console.log('🤖 Generating Storyboard Plan via LLM...');
      const result = await llmClient.generateJSON<StoryboardPlannerResult>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 3500,
        }
      );

      if (!result || !result.meta || !Array.isArray(result.sheets)) {
        throw new Error('LLM response does not match StoryboardPlannerResult schema');
      }

      finalResult = result;
    } catch (error) {
      console.warn('⚠️ LLM Storyboard Planning failed, using deterministic fallback generator:', error instanceof Error ? error.message : error);
      finalResult = this.generateFallbackStoryboard(listing, options, photos, videoJson);
    }

    // If model reference photos (portrait & full body) are present, generate PNG images for each scene
    if (options.portrait_photo_url && options.fullbody_photo_url) {
      await this.generateStoryboardImages(finalResult, listing, photos, options);
    }

    return finalResult;
  }

  /**
   * Generate PNG images for storyboard scenes using Gemini Image Generation model
   */
  private async generateStoryboardImages(
    result: StoryboardPlannerResult,
    listing: ListingWithDetails,
    photos: Array<{ photo_id: string; room_type: string; url: string }>,
    options: StoryboardFormOptions
  ): Promise<void> {
    const portraitUrl = options.portrait_photo_url;
    const fullbodyUrl = options.fullbody_photo_url;
    if (!portraitUrl || !fullbodyUrl) return;

    console.log('🎨 Generating PNG frame images for storyboard using model reference photos & Gemini Flash Image...');

    const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || './uploads', 'storyboards');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    for (const sheet of result.sheets) {
      for (const sc of sheet.scenes) {
        try {
          const photoMatch = photos.find(p => p.photo_id === sc.photo_id);

          const promptParts: string[] = [
            `Photorealistic property video scene frame for real estate listing "${listing.title}" in ${listing.location || 'Bandung'}.`,
            `Scene visual: ${sc.visual_note}. Camera motion: ${sc.camera_motion}.`,
          ];

          if (sc.frame_prompt) {
            promptParts.push(`Composition details: ${sc.frame_prompt}.`);
          }

          if (photoMatch?.url) {
            promptParts.push(`Property environment background reference image: ${photoMatch.url}`);
          }

          if (sc.model_present) {
            promptParts.push(`Real estate agent model appearance reference: Portrait/Face=${portraitUrl}, Fullbody Outfit=${fullbodyUrl}.`);
            if (sc.model_action) promptParts.push(`Model pose and action: ${sc.model_action}.`);
            if (sc.model_position) promptParts.push(`Model position: ${sc.model_position}.`);
          }

          promptParts.push(`Aspect ratio: ${options.aspect_ratio || '9:16'}. Ultra-high resolution photorealistic image.`);

          const response = await axios.post(
            llmConfig.imageBaseURL,
            {
              model: llmConfig.imageModel,
              prompt: promptParts.join(' '),
              n: 1,
              size: options.aspect_ratio === '9:16' ? '1024x1792' : '1024x1024',
            },
            {
              headers: {
                Authorization: `Bearer ${llmConfig.imageToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 60000,
            }
          );

          const b64 = response.data?.data?.[0]?.b64_json;
          if (b64) {
            const filename = `scene_${listing.id.slice(0, 8)}_${sc.scene_no}_${Date.now()}.png`;
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            sc.generated_image_url = `/uploads/storyboards/${filename}`;
            console.log(`✅ Saved scene ${sc.scene_no} PNG image to ${sc.generated_image_url}`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to generate PNG image for scene ${sc.scene_no}:`, err.message || err);
        }
      }
    }
  }

  private buildSystemPrompt(): string {
    return `# SYSTEM PROMPT:
Kamu adalah Storyboard Planner untuk video marketing properti (rumah dan tanah) di wilayah Bandung Raya. Tugasmu mengubah JSON video hasil generate menjadi rencana storyboard terstruktur, yang nanti dirender backend menjadi gambar tabel.

## Peran & Batasan
- Kamu HANYA merencanakan storyboard. Kamu tidak membuat gambar dan tidak menulis ulang script video.
- Sumber kebenaran: (1) JSON video, (2) daftar foto listing, (3) pengaturan form. Jangan menambah fakta di luar itu.
- Jangan pernah mengarang elemen properti (kolam, lantai 2, view gunung, dll) yang tidak ada di foto listing atau JSON.
- Jangan mengubah harga, luas, lokasi, atau spesifikasi dari data listing.
- Semua background/environment WAJIB berasal dari foto listing. Sebutkan photo_id yang dipakai.

## Aturan Berdasarkan Pengaturan Form

### voice_over
- true: sertakan vo_text per scene, ambil dari JSON (jangan tulis ulang kecuali JSON kosong). Bahasa mengikuti language.
- false: vo_text = null. Tabel tidak menampilkan kolom VO.

### model (gender + age_range)
- Model hanya dibuat jika model_reference_available = true DAN scene cocok untuk kehadiran orang.
- model_present = true: isi model_action (aksi/pose singkat) dan model_position (posisi di frame). Gender dan tampilan usia mengikuti gender dan age_range. Pakaian rapi-profesional sesuai konteks agen properti.
- model_present = false: kosongkan model_action dan model_position.
- Jika model_reference_available = false: semua scene model_present = false.

### video_style
- "Aerial / Drone": dominan shot drone (establishing, reveal, orbit, top-down, fly-over, pull-back). Model TIDAK tampil di shot udara. Model boleh tampil hanya di scene darat (halaman depan, teras, interior) jika ada di JSON.
- "Cinematic": camera motion sinematik (slow push-in, pan, tilt, orbit, rack focus). Model opsional sesuai JSON.
- "VO + Walkthrough" atau gaya walkthrough lain: model berjalan/memandu, ikuti alur ruang dari depan ke dalam.
- Gaya lain yang tidak dikenal: ikuti camera_motion dari JSON apa adanya.

### ai_video_model
- Jika "Google Veo 3 / Omni Flash": JSON memakai blok [Visual] + VO. Ambil deskripsi visual dari [Visual] sebagai visual_note (ringkas, maksimal 20 kata) dan VO dari blok VO.

### aspect_ratio & resolution
- Semua frame_prompt harus menyebut rasio ini. Jangan campur rasio.

## Pemetaan Foto ke Scene
1. Cocokkan foto ke scene berdasarkan tipe ruang: fasad, halaman, ruang tamu, kamar tidur, dapur, kamar mandi, taman, lingkungan/aerial.
2. Foto lebih sedikit dari scene: pakai ulang foto dengan crop_hint berbeda (wide, close-up, left, right, top-down).
3. Foto lebih banyak dari scene: pilih yang terbaik (terang, tajam, komposisi jelas).
4. Scene aerial tanpa foto udara: pakai foto fasad/lingkungan dan tandai needs_aerial_simulation = true.
5. Tidak ada foto cocok sama sekali: photo_id = null dan warning = "no_matching_photo".

## Aturan Output
- Balas HANYA dengan JSON valid sesuai skema. Tanpa teks pembuka, tanpa markdown fence, tanpa komentar.
- Maksimal 6 scene per sheet. Jika lebih, bagi ke beberapa sheet berurutan.
- Urutan scene mengikuti JSON video. Durasi mengikuti JSON.
- Semua teks tampilan (VO, overlay, judul) memakai bahasa language. Field teknis tetap bahasa Inggris.
- Jika JSON video tidak valid atau tidak ada scene: balas {"error": "invalid_video_json", "message": "..."}.

## Skema Output
{
  "meta": {
    "listing_title": "string",
    "location": "string",
    "video_style": "string",
    "aspect_ratio": "9:16",
    "resolution": "1080x1920",
    "voice_over": true,
    "gender": "Wanita",
    "age_range": "30-45",
    "language": "Bahasa Indonesia",
    "total_duration_sec": 0,
    "total_scenes": 0,
    "columns": ["scene_no","frame","vo_text","overlay_text","camera_motion","duration_sec"]
  },
  "sheets": [
    {
      "sheet_no": 1,
      "scenes": [
        {
          "scene_no": 1,
          "photo_id": "string|null",
          "crop_hint": "wide|close-up|left|right|top-down|null",
          "needs_aerial_simulation": false,
          "model_present": false,
          "model_action": "string|null",
          "model_position": "string|null",
          "vo_text": "string|null",
          "overlay_text": "string|null",
          "camera_motion": "string",
          "duration_sec": 0,
          "visual_note": "string",
          "frame_prompt": "string",
          "warning": "string|null"
        }
      ]
    }
  ],
  "warnings": []
}

## Aturan columns
- voice_over = true: ["scene_no","frame","vo_text","overlay_text","camera_motion","duration_sec"]
- voice_over = false: ["scene_no","frame","camera_motion","duration_sec"]

## Aturan frame_prompt (dipakai untuk image edit)
- Jika model_present = true: "Place the person from the reference image naturally into this room photo. Keep the room, furniture, lighting, and layout exactly unchanged. Same face, hairstyle, and outfit as the reference. Action: {model_action}. Position: {model_position}. Aspect ratio {aspect_ratio}. Photorealistic, matching the room's lighting and perspective."
- Jika model_present = false: "Use this listing photo as the frame. Crop/compose: {crop_hint}. Aspect ratio {aspect_ratio}. Do not add, remove, or alter any property element. No people."`;
  }

  private buildUserPrompt(data: Record<string, any>): string {
    return `# USER PROMPT
Buat rencana storyboard dari data berikut.

## Pengaturan Form
- Video style: ${data.video_style}
- AI video model: ${data.ai_video_model}
- Format video: ${data.aspect_ratio} (${data.resolution})
- Voice Over: ${data.voice_over}
- Gender: ${data.gender}
- Bahasa: ${data.language}
- Range Usia: ${data.age_range}
- Foto referensi model tersedia: ${data.model_reference_available}

## Data Listing
- Judul: ${data.listing_title}
- Lokasi: ${data.listing_location}
- Tipe properti: ${data.property_type}

## Foto Listing
${data.photos_json}

## JSON Video (hasil generate)
${data.video_json}

Ikuti aturan di system prompt. Balas hanya dengan JSON sesuai skema.`;
  }

  private generateDefaultVideoJson(listing: ListingWithDetails): any {
    return {
      title: listing.title || 'Properti Pilihan',
      scenes: [
        {
          scene_no: 1,
          visual: `Fasad depan ${listing.property_type || 'rumah'} di ${listing.location}`,
          vo: `Selamat datang di ${listing.title || 'properti pilihan di ' + listing.location}.`,
          camera_motion: 'Slow push-in',
          duration_sec: 5,
        },
        {
          scene_no: 2,
          visual: `Area ruang tamu dan ruang keluarga`,
          vo: `Interior lapang dengan tata cahaya alami yang hangat.`,
          camera_motion: 'Smooth pan right',
          duration_sec: 5,
        },
        {
          scene_no: 3,
          visual: `Kamar tidur utama`,
          vo: `Kamar tidur nyaman siap huni.`,
          camera_motion: 'Static shot with slow zoom',
          duration_sec: 5,
        },
        {
          scene_no: 4,
          visual: `Tampilan luar dan lingkungan sekitar`,
          vo: `Lokasi strategis dengan nilai akses yang sangat baik.`,
          camera_motion: 'Pull-back reveal',
          duration_sec: 5,
        },
      ],
    };
  }

  private generateFallbackStoryboard(
    listing: ListingWithDetails,
    options: StoryboardFormOptions,
    photos: Array<{ photo_id: string; room_type: string; url: string }>,
    videoJson: any
  ): StoryboardPlannerResult {
    const videoStyle = options.video_style || 'Cinematic';
    const aspectRatio = options.aspect_ratio || '9:16';
    const resolution = options.resolution || '1080x1920';
    const voiceOver = options.voice_over ?? true;
    const gender = options.gender || 'Wanita';
    const language = options.language || 'Bahasa Indonesia';
    const ageRange = options.age_range || '30-45';

    const scenesInput: any[] = Array.isArray(videoJson?.scenes) ? videoJson.scenes : [
      { scene_no: 1, visual: `Fasad depan ${listing.title}`, vo: 'Selamat datang.', camera_motion: 'Slow push-in', duration_sec: 5 }
    ];

    const mappedScenes: StoryboardSceneOutput[] = scenesInput.map((s, idx) => {
      const sceneNo = idx + 1;
      const matchedPhoto = photos[idx % Math.max(photos.length, 1)];
      const photoId = matchedPhoto ? matchedPhoto.photo_id : null;
      const cropHint: 'wide' | 'close-up' | 'left' | 'right' | 'top-down' | null =
        idx % 4 === 0 ? 'wide' : idx % 4 === 1 ? 'close-up' : idx % 4 === 2 ? 'left' : 'right';

      const isAerial = videoStyle.toLowerCase().includes('aerial') || (s.camera_motion || '').toLowerCase().includes('drone');
      const needsAerialSimulation = isAerial && Boolean(matchedPhoto);

      const voText = voiceOver ? (s.vo || s.vo_text || `Scene ${sceneNo}`) : null;
      const overlayText = s.overlay || s.overlay_text || (idx === 0 ? listing.title : null);

      const framePrompt = `Use this listing photo as the frame. Crop/compose: ${cropHint}. Aspect ratio ${aspectRatio}. Do not add, remove, or alter any property element. No people.`;

      return {
        scene_no: sceneNo,
        photo_id: photoId,
        crop_hint: cropHint,
        needs_aerial_simulation: needsAerialSimulation,
        model_present: false,
        model_action: null,
        model_position: null,
        vo_text: voText,
        overlay_text: overlayText,
        camera_motion: s.camera_motion || 'Slow push-in',
        duration_sec: s.duration_sec || 5,
        visual_note: (s.visual || s.visual_note || 'Properti').slice(0, 100),
        frame_prompt: framePrompt,
        warning: photoId ? null : 'no_matching_photo',
      };
    });

    const totalDuration = mappedScenes.reduce((sum, sc) => sum + sc.duration_sec, 0);

    // Group max 6 scenes per sheet
    const sheets: StoryboardSheetOutput[] = [];
    for (let i = 0; i < mappedScenes.length; i += 6) {
      sheets.push({
        sheet_no: Math.floor(i / 6) + 1,
        scenes: mappedScenes.slice(i, i + 6),
      });
    }

    const columns = voiceOver
      ? ['scene_no', 'frame', 'vo_text', 'overlay_text', 'camera_motion', 'duration_sec']
      : ['scene_no', 'frame', 'camera_motion', 'duration_sec'];

    return {
      meta: {
        listing_title: listing.title || 'Properti',
        location: listing.location || 'Bandung',
        video_style: videoStyle,
        aspect_ratio: aspectRatio,
        resolution,
        voice_over: voiceOver,
        gender,
        age_range: ageRange,
        language,
        total_duration_sec: totalDuration,
        total_scenes: mappedScenes.length,
        columns,
      },
      sheets,
      warnings: [],
    };
  }
}

export default new StoryboardPlannerService();