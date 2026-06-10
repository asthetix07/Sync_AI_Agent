import ChatLayout from "@/components/ChatLayout";

export default function ChatSharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ChatLayout reads the sessionId from the URL via useParams(),
  // so we render it here in the shared layout to keep it mounted
  // across /chat and /chat/[sessionId] navigations.
  // The children (page.tsx files) render nothing — they only exist
  // so Next.js creates the correct URL segments.
  return <ChatLayout />;
}
