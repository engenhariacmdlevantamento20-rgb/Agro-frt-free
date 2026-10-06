import { pool } from "@/lib/db";
import { route, requireUser } from "@/lib/api";

// LGPD: cópia dos dados do próprio usuário (sem arquivos de documentos).
export const GET = route(async () => {
  const u = await requireUser();
  const q = async (sql: string) => (await pool.query(sql, [u.id])).rows;
  const data = {
    conta: (await q("SELECT id,name,email,phone,share_phone,created_at FROM users WHERE id=$1"))[0],
    papeis: await q("SELECT role FROM user_roles WHERE user_id=$1"),
    consentimentos: await q("SELECT type,version,accepted_at FROM consents WHERE user_id=$1"),
    fazendas: await q("SELECT id,name,state_code,address_reference,access_notes,created_at FROM farms WHERE owner_id=$1"),
    caminhoes: await q("SELECT plate,brand,model,year,type,capacity_heads FROM trucks WHERE owner_id=$1"),
    solicitacoes: await q("SELECT id,origin_name,dest_name,pickup_date,status,created_at FROM transport_requests WHERE producer_id=$1"),
    propostas: await q("SELECT request_id,price_cents,status,created_at FROM quotes WHERE transporter_id=$1"),
    transportes: await q("SELECT id,status,created_at,completed_at FROM transports WHERE producer_id=$1 OR transporter_id=$1"),
    avaliacoes_dadas: await q("SELECT transport_id,overall,comment,created_at FROM ratings WHERE rater_id=$1"),
    avaliacoes_recebidas: await q("SELECT transport_id,overall,comment,created_at FROM ratings WHERE ratee_id=$1"),
  };
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="meus-dados-agro-frete.json"' } });
});
