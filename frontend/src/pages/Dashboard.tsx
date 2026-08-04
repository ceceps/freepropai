import { Link } from 'react-router-dom';
import { Users, MessageSquare, Home } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">FreePropAI</h1>
            <div className="flex space-x-4">
              <Link to="/dashboard" className="text-primary-600 font-medium">Dashboard</Link>
              <Link to="/leads" className="text-gray-600 hover:text-gray-900">Leads</Link>
              <Link to="/followups" className="text-gray-600 hover:text-gray-900">Follow-ups</Link>
              <Link to="/listings" className="text-gray-600 hover:text-gray-900">Listings</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <Users className="w-12 h-12 text-primary-500" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Follow-ups</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <MessageSquare className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Listings</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <Home className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/leads" className="btn btn-primary text-center">
              Add New Lead
            </Link>
            <Link to="/followups" className="btn btn-secondary text-center">
              Review Follow-ups
            </Link>
            <Link to="/listings" className="btn btn-secondary text-center">
              Create Listing
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
