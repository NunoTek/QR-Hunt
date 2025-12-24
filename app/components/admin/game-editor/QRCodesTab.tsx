import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { Camera, Check, Circle, Download, Loader } from "~/components/icons";
import { NodeBadge } from "./NodeBadge";
import { type QRCode, type QRFilter } from "./types";

interface QRCodesTabProps {
  qrCodes: QRCode[];
  filteredQRCodes: QRCode[];
  qrFilter: QRFilter;
  setQRFilter: (filter: QRFilter) => void;
  onSelectQR: (qr: { url: string; title: string }) => void;
  onCopyUrl: (url: string) => void;
  onDownloadAll: () => void;
  onOpenScanner: () => void;
  downloadingQRCodes: boolean;
  downloadProgress: { current: number; total: number };
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function QRCodesTab({
  qrCodes,
  filteredQRCodes,
  qrFilter,
  setQRFilter,
  onSelectQR,
  onCopyUrl,
  onDownloadAll,
  onOpenScanner,
  downloadingQRCodes,
  downloadProgress,
  t,
}: QRCodesTabProps) {
  return (
    <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-primary">{t("pages.admin.gameEditor.qrcodes.title")}</h3>
          <p className="text-secondary text-sm mt-1">{t("pages.admin.gameEditor.qrcodes.description")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="primary"
            onClick={onDownloadAll}
            disabled={downloadingQRCodes || qrCodes.length === 0}
            leftIcon={downloadingQRCodes ? <Loader size={16} /> : <Download size={16} />}
          >
            {downloadingQRCodes ? `${downloadProgress.current}/${downloadProgress.total}` : t("pages.admin.gameEditor.qrcodes.downloadAll")}
          </Button>
          <Button
            variant="secondary"
            onClick={onOpenScanner}
            leftIcon={<Camera size={16} />}
          >
            {t("pages.admin.gameEditor.qrcodes.scanToIdentify")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t("pages.admin.gameEditor.qrcodes.filterByTitle")}
            value={qrFilter.title}
            onChange={(e) => setQRFilter({ ...qrFilter, title: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={qrFilter.activated}
            onChange={(e) => setQRFilter({ ...qrFilter, activated: e.target.value as QRFilter["activated"] })}
            className="w-full px-3 py-2 text-sm bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">{t("pages.admin.gameEditor.qrcodes.allStatus")}</option>
            <option value="activated">{t("pages.admin.gameEditor.qrcodes.activated")}</option>
            <option value="not-activated">{t("pages.admin.gameEditor.qrcodes.notActivated")}</option>
          </select>
        </div>
        <div className="text-sm text-muted self-center">
          {t("pages.admin.gameEditor.qrcodes.count", { filtered: filteredQRCodes.length, total: qrCodes.length })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.qrcodes.tableHeaders.node")}</th>
              <th className="min-w-[200px] text-left px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.qrcodes.tableHeaders.url")}</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">{t("pages.admin.gameEditor.qrcodes.tableHeaders.activated")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredQRCodes.map((qr) => (
              <tr key={qr.nodeId} className="hover:bg-secondary">
                <td className="px-4 py-3 text-primary">
                  {qr.title}
                  {qr.isStart && <NodeBadge type="start" t={t} />}
                  {qr.isEnd && <NodeBadge type="end" t={t} />}
                </td>
                <td className="min-w-[200px] px-4 py-3">
                  <code className="text-xs text-secondary break-all">{qr.url}</code>
                </td>
                <td className="px-4 py-3 text-center">
                  <Form method="post" className="inline">
                    <input type="hidden" name="_action" value="toggleActivated" />
                    <input type="hidden" name="nodeId" value={qr.nodeId} />
                    <input type="hidden" name="activated" value={(!qr.activated).toString()} />
                    <button
                      type="submit"
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                        qr.activated
                          ? "bg-success/20 text-success hover:bg-success/30"
                          : "bg-muted/20 text-muted hover:bg-muted/30"
                      }`}
                      title={qr.activated ? t("pages.admin.gameEditor.qrcodes.activation.clickToDeactivate") : t("pages.admin.gameEditor.qrcodes.activation.clickToActivate")}
                    >
                      {qr.activated ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={16} />
                      )}
                    </button>
                  </Form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <Button variant="primary" onClick={() => onSelectQR({ url: qr.url, title: qr.title })}>{t("pages.admin.gameEditor.qrcodes.buttons.generateQR")}</Button>
                    <Button variant="secondary" className="hidden sm:flex" onClick={() => onCopyUrl(qr.url)}>{t("pages.admin.gameEditor.qrcodes.buttons.copyUrl")}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredQRCodes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">{t("pages.admin.gameEditor.qrcodes.noQRCodes")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
