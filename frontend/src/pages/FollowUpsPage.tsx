import { Link } from 'react-router-dom';

export default function FollowUpsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">FreePropAI</h1>
            <div className="flex space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link to="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link to="/followups" className="text-primary-600 font-medium">Follow-ups</Link>
              <Link to="/listings" className="text-gray-600 hover:text-gray-900">Listings</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Follow-up Approval Queue</h2>
        
        <div className="card">
          <p className="text-gray-600">Follow-up scheduler feature will be implemented in Phase 3</p>
        </div>
      </main>
    </div>
  );
}
