import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">FriendlyFit</h1>
          <p className="text-2xl text-gray-700 font-medium">
            Friendly Fitness Challenge
          </p>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Compete in multi-week challenges, track weekly tasks, climb
            leaderboards, and win with your friends.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 bg-white text-blue-600 font-medium rounded-lg shadow hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-2">
                Weekly Challenges
              </h3>
              <p className="text-sm text-gray-600">
                Complete tasks, earn points, and compete for weekly prizes
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-2">
                Token Economy
              </h3>
              <p className="text-sm text-gray-600">
                Earn tokens with perfect weeks and stake them in head-to-head challenges
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900 mb-2">
                Honor System
              </h3>
              <p className="text-sm text-gray-600">
                Simple task tracking with your trusted friends group
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
