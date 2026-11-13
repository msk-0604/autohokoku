/**
 * ローカル開発用のデモデータを作成する（本番では実行しないこと）。
 *   npm run db:migrate && npm run db:seed
 * ログイン: demo@example.com / demo-pass-2026
 */
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { customers, memberships, organizations, reportVersions, sites, users, workReportPhotos, workReports } from "../src/lib/db/schema";
import { hashPassword, newId } from "../src/lib/crypto";
import { putObject } from "../src/lib/storage";
import { buildSnapshot } from "../src/lib/data/reports";
import { env } from "../src/lib/env";

if (env.DB_DRIVER !== "sqlite" || process.env.NODE_ENV === "production") {
  console.error("seed はローカルの SQLite でのみ実行できます");
  process.exit(1);
}

const EMAIL = "demo@example.com";
const DAY = 86400_000;

async function main() {
  const existing = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  if (existing[0]) {
    console.log("デモデータは作成済みです:", EMAIL);
    return;
  }
  const now = Date.now();
  const orgId = newId();
  const userId = newId();
  await db.insert(organizations).values({
    id: orgId,
    name: "デモ設備工業株式会社",
    postalCode: "100-0001",
    address: "東京都千代田区千代田1-1 デモビル3F",
    phone: "03-0000-0000",
    email: "info@example.com",
    planStatus: "trialing",
    trialEndsAt: new Date(now + 14 * DAY),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });
  await db.insert(users).values({ id: userId, email: EMAIL, name: "山田 太郎", passwordHash: await hashPassword("demo-pass-2026"), emailVerifiedAt: new Date(now), createdAt: new Date(now), updatedAt: new Date(now) });
  await db.insert(memberships).values({ id: newId(), orgId, userId, role: "admin", createdAt: new Date(now), updatedAt: new Date(now) });

  const custs = [
    { name: "株式会社サンプル商事", companyName: "株式会社サンプル商事", contactName: "佐藤 花子", email: "sato@example.com", phone: "03-1111-2222", address: "東京都港区芝公園1-2-3" },
    { name: "グリーンハイツ管理組合", companyName: null, contactName: "理事長 鈴木", email: "green@example.com", phone: "045-000-1111", address: "神奈川県横浜市西区1-1" },
    { name: "田中 一郎", companyName: null, contactName: null, email: "tanaka@example.com", phone: "090-0000-0000", address: "埼玉県さいたま市大宮区2-3" },
  ];
  const custIds: string[] = [];
  for (const c of custs) {
    const id = newId();
    custIds.push(id);
    await db.insert(customers).values({ id, orgId, ...c, createdBy: userId, createdAt: new Date(now), updatedAt: new Date(now) });
  }
  const siteDefs = [
    { name: "サンプル商事 本社ビル 3F事務所", customerId: custIds[0], address: "東京都港区芝公園1-2-3", managerName: "山田", workDescription: "業務用エアコン入替" },
    { name: "グリーンハイツ 共用部", customerId: custIds[1], address: "神奈川県横浜市西区1-1", managerName: "鈴木", workDescription: "分電盤点検" },
    { name: "田中様邸", customerId: custIds[2], address: "埼玉県さいたま市大宮区2-3", managerName: "山田", workDescription: "ルームエアコン設置" },
  ];
  const siteIds: string[] = [];
  for (const s of siteDefs) {
    const id = newId();
    siteIds.push(id);
    await db.insert(sites).values({ id, orgId, ...s, createdBy: userId, createdAt: new Date(now), updatedAt: new Date(now) });
  }

  const reports = [
    {
      title: "業務用エアコン入替工事",
      siteIdx: 0,
      final: true,
      workContent: "3F事務所の天井カセット形エアコン（2台）を撤去し、新しい機器へ入れ替えました。\n冷媒配管・ドレン配管を接続後、気密試験・真空引きを実施しました。\n動作確認を行い、正常に稼働することを確認しました。\n作業後、周辺の清掃・片付けを行いました。",
      materials: "天井カセット形エアコン 4方向 ×2台\n冷媒配管 2分4分 ×12m\nドレンホース ×6m",
      specialNotes: "既存配管の一部に劣化が見られたため、該当箇所を交換しました。",
      nextSchedule: "1か月後に運転状況の確認にお伺いします。",
      photos: [
        ["ac-before.jpg", "before", "撤去前の既存エアコン。フィルター周辺に汚れの蓄積あり。"],
        ["outdoor-unit.jpg", "during", "室外機の設置作業。架台を固定し、配管を接続。"],
        ["panel.jpg", "during", "専用回路のブレーカーを確認。"],
        ["ac-after.jpg", "after", "入替完了。試運転良好。"],
      ],
    },
    {
      title: "分電盤 定期点検",
      siteIdx: 1,
      final: true,
      workContent: "共用部分電盤の定期点検を実施しました。\n絶縁抵抗測定・端子の締め付け確認を行い、異常はありませんでした。",
      materials: null,
      specialNotes: null,
      nextSchedule: "次回点検：半年後",
      photos: [["panel.jpg", "before", "点検前の分電盤。"], ["panel.jpg", "after", "点検完了。異常なし。"]],
    },
    { title: "ルームエアコン設置", siteIdx: 2, final: false, workContent: "リビングにルームエアコンを新規設置。", materials: null, specialNotes: null, nextSchedule: null, photos: [["ac-after.jpg", "after", "設置完了"]] },
  ] as const;

  let seq = 0;
  for (const [i, r] of reports.entries()) {
    seq++;
    const id = newId();
    const created = new Date(now - (reports.length - i) * DAY);
    await db.insert(workReports).values({
      id,
      orgId,
      reportNumber: `R-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
      status: r.final ? "final" : "draft",
      version: r.final ? 1 : 0,
      title: r.title,
      workDate: created.toISOString().slice(0, 10),
      customerId: siteDefs[r.siteIdx].customerId,
      siteId: siteIds[r.siteIdx],
      workerNames: "山田 太郎、鈴木 次郎",
      startTime: "09:00",
      endTime: "16:30",
      workContent: r.workContent,
      materials: r.materials,
      specialNotes: r.specialNotes,
      nextSchedule: r.nextSchedule,
      createdBy: userId,
      finalizedAt: r.final ? created : null,
      finalizedBy: r.final ? userId : null,
      createdAt: created,
      updatedAt: created,
    });
    for (const [j, [file, category, caption]] of r.photos.entries()) {
      const photoId = newId();
      const body = new Uint8Array(readFileSync(`scripts/seed-photos/${file}`));
      const key = `orgs/${orgId}/reports/${id}/${photoId}.jpg`;
      await putObject(key, body, "image/jpeg");
      await db.insert(workReportPhotos).values({ id: photoId, orgId, reportId: id, storageKey: key, contentType: "image/jpeg", sizeBytes: body.byteLength, width: 1600, height: 1200, category, caption, sortOrder: j, createdBy: userId, createdAt: created, updatedAt: created });
    }
    if (r.final) {
      const snap = await buildSnapshot(orgId, id);
      await db.insert(reportVersions).values({ id: newId(), orgId, reportId: id, version: 1, snapshot: JSON.stringify(snap), createdBy: userId, createdAt: created });
    }
  }
  await db.update(organizations).set({ reportSeq: seq }).where(eq(organizations.id, orgId));
  console.log(`デモデータを作成しました。ログイン: ${EMAIL} / demo-pass-2026`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
