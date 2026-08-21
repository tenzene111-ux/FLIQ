import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FliqMark } from "@/components/ui/FliqLogo";
import { Button } from "@/components/ui/Button";
import { PlayCircle, Video, Users, MessageCircle, Compass, UserCircle } from "lucide-react";

const FEATURES = [
  { icon: PlayCircle, title: "Endless Videos", desc: "Personalized feed just for you" },
  { icon: Video, title: "Create & Edit", desc: "Powerful tools to record, edit and share" },
  { icon: Users, title: "Connect", desc: "Follow creators, like, comment and share" },
  { icon: MessageCircle, title: "Inbox", desc: "Messages, updates and friend requests" },
  { icon: Compass, title: "Discover", desc: "Explore trends, hashtags and top creators" },
  { icon: UserCircle, title: "Profile", desc: "Manage your content, likes and playlists" },
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/home");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <FliqMark size={72} />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white">Fliq</h1>
        <p className="mt-2 text-lg font-semibold text-gradient-brand">Watch. Create. Share.</p>
        <p className="mt-3 text-muted text-sm max-w-xs">
          The next-gen video platform made for creators and built for community.
        </p>

        <div className="mt-10 w-full grid grid-cols-2 gap-3 text-left">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-xl p-3.5 flex flex-col gap-2">
              <f.icon size={20} className="text-fliq-cyan" />
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{f.title}</p>
                <p className="text-muted-2 text-xs mt-0.5 leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 w-full flex flex-col gap-3">
          <Link href="/signup" className="w-full">
            <Button size="lg" fullWidth>
              Create account
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button size="lg" variant="outline" fullWidth>
              Log in
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-2">
          Demo login: <span className="text-muted">demo@fliq.app</span> / <span className="text-muted">Password123!</span>
        </p>
      </div>
    </div>
  );
}
