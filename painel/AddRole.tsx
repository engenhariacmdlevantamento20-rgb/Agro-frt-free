"use client";
import { post } from "@/lib/client";
export default function AddRole({ role }: { role: "producer" | "transporter" }) {
  return (
    <button className="btn sec" onClick={async () => { await post("/api/me/roles", { role }); window.location.reload(); }}>
      {role === "transporter" ? "Também sou transportador" : "Também sou produtor"}
    </button>
  );
}
