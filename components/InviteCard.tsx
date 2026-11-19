import QRCode from "qrcode";
import { requestOrigin } from "@/lib/auth";
import { formatJoinCode, type Team } from "@/lib/hunt";

/** Team invite: a QR teammates scan straight off this phone's screen, plus a typeable code. */
export default async function InviteCard({ team }: { team: Team }) {
  const origin = await requestOrigin();
  const url = `${origin}/t/${team.joinCode}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
  return (
    <div className="invite">
      <div className="invite-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <p className="eyebrow">Team code</p>
        <p className="join-code mono">{formatJoinCode(team.joinCode)}</p>
        <p className="invite-help">
          Teammates: scan this QR with your camera, or open <strong>{origin.replace(/^https?:\/\//, "")}/join</strong> and
          type the code.
        </p>
      </div>
    </div>
  );
}
