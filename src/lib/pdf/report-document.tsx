/* eslint-disable jsx-a11y/alt-text -- react-pdf の Image は alt を持たない */
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "@/lib/data/reports";
import { formatDate, workDuration } from "@/lib/dates";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: path.join(FONT_DIR, "NotoSansJP_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "NotoSansJP_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // 日本語は単語区切りが無いので、1文字ごとに改行できるようにする（ハイフンは付かない）
  Font.registerHyphenationCallback((word) => {
    if (/[　-鿿豈-﫿＀-￯]/.test(word)) {
      return Array.from(word).flatMap((ch) => [ch, ""]);
    }
    return [word];
  });
  fontsRegistered = true;
}

export const PDF_LAYOUTS = ["grid", "list"] as const;
export type PdfLayout = (typeof PDF_LAYOUTS)[number];

export type PdfOrg = { name: string; address: string | null; phone: string | null; postalCode: string | null; email: string | null; logo: { data: Buffer; format: "jpg" | "png" } | null };
export type PdfPhoto = ReportSnapshot["photos"][number] & { image: { data: Buffer; format: "jpg" | "png" } | null };

const NAVY = "#0f2a4a";
const BLUE = "#2563eb";
const LINE = "#cbd5e1";
const MUTED = "#64748b";

const CATEGORY_LABEL: Record<string, string> = { before: "作業前", during: "作業中", after: "作業後", other: "その他" };
const CATEGORY_COLOR: Record<string, string> = { before: "#475569", during: BLUE, after: "#059669", other: "#94a3b8" };

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: 9.5, color: "#0f172a", paddingTop: 34, paddingBottom: 46, paddingHorizontal: 36, lineHeight: 1.55 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  logo: { maxWidth: 150, maxHeight: 46, objectFit: "contain" },
  company: { textAlign: "right", fontSize: 8.5, color: "#334155", maxWidth: 260 },
  companyName: { fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 2 },
  // 題名は1行で独立させ、行の高さを明示して下線と重ならないようにする
  titleWrap: { borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 8, marginBottom: 10 },
  title: { fontSize: 19, fontWeight: 700, color: NAVY, letterSpacing: 2, lineHeight: 1.4 },
  meta: { fontSize: 8.5, color: "#334155", textAlign: "right", marginBottom: 6 },
  lead: { fontSize: 9.5, marginBottom: 8 },
  table: { borderWidth: 1, borderColor: LINE, borderBottomWidth: 0, marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  th: { width: 72, backgroundColor: "#f1f5f9", paddingVertical: 5, paddingHorizontal: 6, fontWeight: 700, color: NAVY, fontSize: 8.5, borderRightWidth: 1, borderRightColor: LINE },
  td: { flex: 1, paddingVertical: 5, paddingHorizontal: 6 },
  tdBorder: { borderRightWidth: 1, borderRightColor: LINE },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, color: NAVY, borderLeftWidth: 3, borderLeftColor: BLUE, paddingLeft: 6, marginBottom: 4 },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 8, minHeight: 28 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCard: { width: "49%", marginBottom: 10, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 5 },
  gridImageBox: { height: 160, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  gridImage: { maxWidth: "100%", maxHeight: 160, objectFit: "contain" },
  listCard: { flexDirection: "row", marginBottom: 10, borderWidth: 1, borderColor: LINE, borderRadius: 3, padding: 6 },
  listImageBox: { width: 270, height: 200, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center" },
  listImage: { maxWidth: 270, maxHeight: 200, objectFit: "contain" },
  listText: { flex: 1, paddingLeft: 10 },
  photoHead: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 2 },
  photoNo: { fontWeight: 700, color: NAVY, marginRight: 6 },
  catTag: { fontSize: 7.5, color: "#ffffff", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 },
  caption: { fontSize: 9 },
  noImage: { color: MUTED, fontSize: 8 },
  footerLine: { position: "absolute", top: 808, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: LINE },
  footerLeft: { position: "absolute", top: 814, left: 36, fontSize: 7.5, color: MUTED },
  // render を使う Text は親の lineHeight と bottom 指定の組み合わせで描画されないため top で配置する（A4 高さ 842pt）
  footerRight: { position: "absolute", top: 814, right: 36, fontSize: 7.5, color: MUTED },
});

function Row({ cells }: { cells: [string, string][] }) {
  return (
    <View style={s.row} wrap={false}>
      {cells.map(([label, value], i) => (
        <View key={label} style={{ flexDirection: "row", flex: 1 }}>
          <Text style={s.th}>{label}</Text>
          <Text style={[s.td, i < cells.length - 1 ? s.tdBorder : {}]}>{value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function TextSection({ title, body, always }: { title: string; body: string | null; always?: boolean }) {
  if (!body && !always) return null;
  return (
    <View style={s.section} minPresenceAhead={40}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.box}>
        <Text>{body || "—"}</Text>
      </View>
    </View>
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const circled = (n: number) => (n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : `(${n})`);

function PhotoHead({ index, photo }: { index: number; photo: PdfPhoto }) {
  return (
    <View style={s.photoHead}>
      <Text style={s.photoNo}>{circled(index + 1)}</Text>
      <Text style={[s.catTag, { backgroundColor: CATEGORY_COLOR[photo.category] ?? MUTED }]}>{CATEGORY_LABEL[photo.category] ?? "その他"}</Text>
    </View>
  );
}

export function ReportPdf({ report, org, photos, layout = "grid", draft = false, issuedAtMs }: { report: ReportSnapshot; org: PdfOrg; photos: PdfPhoto[]; layout?: PdfLayout; draft?: boolean; issuedAtMs: number }) {
  registerFonts();
  const time = report.startTime || report.endTime ? `${report.startTime ?? ""} 〜 ${report.endTime ?? ""}${workDuration(report.startTime, report.endTime) ? `（${workDuration(report.startTime, report.endTime)}）` : ""}` : "";
  const customer = [report.customerName, report.customerCompany && report.customerCompany !== report.customerName ? report.customerCompany : null].filter(Boolean).join(" / ");
  const issuedAt = formatDate(report.finalizedAt ?? issuedAtMs);
  return (
    <Document title={`作業報告書 ${report.reportNumber}`} author={org.name} creator={org.name} producer={org.name} language="ja">
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.footerLine} fixed />
        <Text style={s.footerLeft} fixed>
          {org.name}　報告書No. {report.reportNumber}
        </Text>
        <View style={s.header}>
          {/* ロゴが無い場合は右側の会社情報だけを出す（会社名の重複表示を避ける） */}
          <View>{org.logo ? <Image src={org.logo} style={s.logo} /> : null}</View>
          <View style={s.company}>
            <Text style={s.companyName}>{org.name}</Text>
            {(org.postalCode || org.address) && <Text>{[org.postalCode && `〒${org.postalCode}`, org.address].filter(Boolean).join(" ")}</Text>}
            {org.phone && <Text>TEL {org.phone}</Text>}
            {org.email && <Text>{org.email}</Text>}
          </View>
        </View>

        <View style={s.meta}>
          <Text>報告書No. {report.reportNumber}{report.version > 1 ? `（第${report.version}版）` : ""}</Text>
          <Text>作成日 {issuedAt}</Text>
          {draft && <Text style={{ color: "#b45309", fontWeight: 700 }}>【下書き・未確定】</Text>}
        </View>
        <View style={s.titleWrap}>
          <Text style={s.title}>{report.title ? `${report.title}　報告書` : "作業報告書"}</Text>
        </View>

        {report.customerName && <Text style={s.lead}>{report.customerName} 様　下記のとおり作業を実施いたしましたので、ご報告申し上げます。</Text>}

        <View style={s.table}>
          <Row cells={[["顧客名", customer], ["現場名", report.siteName ?? ""]]} />
          {report.siteAddress && <Row cells={[["現場住所", report.siteAddress]]} />}
          <Row cells={[["作業日", formatDate(report.workDate)], ["作業時間", time]]} />
          <Row cells={[["作業担当者", report.workerNames ?? ""], ["作成者", report.creatorName ?? ""]]} />
        </View>

        <TextSection title="作業内容" body={report.workContent} always />
        <TextSection title="使用材料" body={report.materials} />
        <TextSection title="特記事項" body={report.specialNotes} />
        <TextSection title="次回作業予定" body={report.nextSchedule} />

        {photos.length > 0 &&
          (layout === "grid" ? chunk(photos, 2) : chunk(photos, 1)).map((row, r) => (
            <View key={r} wrap={false} style={layout === "grid" ? s.photoRow : undefined}>
              {r === 0 && <Text style={[s.sectionTitle, { marginTop: 4, marginBottom: 6, width: "100%" }]}>作業写真（{photos.length}枚）</Text>}
              {row.map((p, j) => {
                const i = layout === "grid" ? r * 2 + j : r;
                return layout === "grid" ? (
                  <View key={p.id} style={s.gridCard}>
                    <View style={s.gridImageBox}>{p.image ? <Image src={p.image} style={s.gridImage} /> : <Text style={s.noImage}>画像を読み込めませんでした</Text>}</View>
                    <PhotoHead index={i} photo={p} />
                    {p.caption && <Text style={s.caption}>{p.caption}</Text>}
                  </View>
                ) : (
                  <View key={p.id} style={s.listCard}>
                    <View style={s.listImageBox}>{p.image ? <Image src={p.image} style={s.listImage} /> : <Text style={s.noImage}>画像を読み込めませんでした</Text>}</View>
                    <View style={s.listText}>
                      <PhotoHead index={i} photo={p} />
                      <Text style={s.caption}>{p.caption ?? ""}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
}
