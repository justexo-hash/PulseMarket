import { notFound } from "next/navigation";
import { getSession } from "../../../api/_utils/session";
import { getPulseProfile } from "@server/profiles";
import { PulseProfileView } from "./profile-view";

interface ProfilePageProps {
  params: { username: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = getSession();
  const profile = await getPulseProfile(
    params.username.toLowerCase(),
    session?.userId
  );

  if (!profile) {
    notFound();
  }

  return <PulseProfileView profile={profile} viewerId={session?.userId} />;
}

