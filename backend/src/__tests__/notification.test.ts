import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { db } from '../db';
import { notifications } from '../db/schema';
import { countGeneratedStoryboardImages, notificationService } from '../services/notification.service';

describe('Notifications', () => {
  beforeEach(async () => {
    await db.delete(notifications);
  });

  it('counts generated storyboard images', () => {
    expect(countGeneratedStoryboardImages({
      sheets: [
        { scenes: [{ generated_image_url: '/uploads/a.png' }, { generated_image_url: null }] },
        { scenes: [{ generated_image_url: '/uploads/b.png' }] },
      ],
    })).toBe(2);
  });

  it('lists notifications with unread count', async () => {
    await notificationService.create({
      type: 'scrape_complete',
      title: 'Scraping complete',
      message: '3 listings scraped from hepihos',
      link: '/scraping?job=abc',
    });
    await notificationService.create({
      type: 'storyboard_images',
      title: 'Storyboard images ready',
      message: '4 storyboard images generated for Villa',
      link: '/listings/xyz',
    });

    const res = await request(app).get('/api/notifications').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.unreadCount).toBe(2);
    expect(res.body.data.items[0].title).toBe('Storyboard images ready');
  });

  it('marks a notification as read', async () => {
    const created = await notificationService.create({
      type: 'scrape_complete',
      title: 'Scraping complete',
      message: '1 listing scraped from acehome',
      link: '/scraping',
    });

    const res = await request(app).patch(`/api/notifications/${created.id}/read`).expect(200);
    expect(res.body.data.readAt).toBeTruthy();

    const listed = await request(app).get('/api/notifications').expect(200);
    expect(listed.body.data.unreadCount).toBe(0);
  });

  it('marks all notifications as read', async () => {
    await notificationService.create({
      type: 'scrape_failed',
      title: 'Scraping failed',
      message: 'timeout',
    });
    await notificationService.create({
      type: 'scrape_complete',
      title: 'Scraping complete',
      message: '2 listings scraped from prolov',
    });

    const res = await request(app).patch('/api/notifications/read-all').expect(200);
    expect(res.body.data.updated).toBe(2);

    const listed = await request(app).get('/api/notifications').expect(200);
    expect(listed.body.data.unreadCount).toBe(0);
  });
});
