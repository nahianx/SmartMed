export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to SmartMed
        </h1>
        <p className="text-center text-gray-600">
          Healthcare Management System - Monorepo Architecture
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Patient Management</h2>
            <p className="text-gray-600">
              Manage patient records, appointments, and medical history
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Doctor Portal</h2>
            <p className="text-gray-600">
              Access patient data, prescriptions, and schedules
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">
              Manage system settings, users, and analytics
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
