import { createServerClient } from '@/lib/supabase/server';

export default async function DebugAuthPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Auth Info</h1>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">User ID:</h2>
        <pre>{user.id}</pre>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">User Metadata:</h2>
        <pre>{JSON.stringify(user.user_metadata, null, 2)}</pre>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">App Metadata:</h2>
        <pre>{JSON.stringify(user.app_metadata, null, 2)}</pre>
      </div>

      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-semibold mb-2">Full User Object:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}
