import { PrivateWagerClient } from "./PrivateWagerClient";

interface PrivateWagerPageProps {
  params: { inviteCode: string };
}

export default function PrivateWagerPage({ params }: PrivateWagerPageProps) {
  return <PrivateWagerClient inviteCode={params.inviteCode} />;
}

