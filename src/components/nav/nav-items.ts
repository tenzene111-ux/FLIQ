import { Home, Compass, MessageCircle, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home, match: ["/home"] },
  { href: "/discover", label: "Discover", icon: Compass, match: ["/discover", "/search"] },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, match: ["/inbox"] },
  { href: "/profile", label: "Profile", icon: User, match: ["/profile"] },
] as const;

export const GRADIENT_ID = "fliq-nav-gradient";
