import React from 'react';

export const Settings = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Settings</h1>
        <div className="space-y-8">
          {/* User Preferences */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">🛠️</span>
              User Preferences
            </h2>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
                <span className="text-gray-600">Enable dark mode</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" />
                <span className="text-gray-600">Show advanced options</span>
              </label>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">🔔</span>
              Notifications
            </h2>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-green-600" />
                <span className="text-gray-600">Email notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-green-600" />
                <span className="text-gray-600">Push notifications</span>
              </label>
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <span className="inline-block w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center">👤</span>
              Account Settings
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-600 mb-1">Change Email</label>
                <input type="email" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Enter new email" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Change Password</label>
                <input type="password" className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Enter new password" />
              </div>
              <button className="mt-2 w-fit px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Save Changes</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
