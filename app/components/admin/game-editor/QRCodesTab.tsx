import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { Check, Circle } from "~/components/icons";
import { NodeBadge } from "./NodeBadge";
import { type QRCode } from "./types";

interface QRFilter {
  title: string;
  activated: "all" | "activated" | "not-activated";
}

interface QRCodesTabProps {
  qrCodes: QRCode[];
  filteredQRCodes: QRCode[];
  qrFilter: QRFilter;
  setQRFilter: (filter: QRFilter) => void;
  onSelectQR: (qr: { url: string; title: string }) => void;
  onCopyUrl: (url: string) => void;
  t: (key: string) => string;
}

export function QRCodesTab({
  qrCodes,
  filteredQRCodes,
  qrFilter,
  setQRFilter,
  onSelectQR,
  onCopyUrl,
  t,
}: QRCodesTabProps) {
  return (
    <div className="bg-elevated rounded-xl border overflow-hidden shadow-sm">
      {/* Filters */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter by title..."
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
            <option value="all">All Status</option>
            <option value="activated">Activated</option>
            <option value="not-activated">Not Activated</option>
          </select>
        </div>
        <div className="text-sm text-muted self-center">
          {filteredQRCodes.length} / {qrCodes.length} QR codes
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="min-w-[200px] text-left px-4 py-3 text-xs font-medium text-muted uppercase">Node</th>
              <th className="min-w-[200px] text-left px-4 py-3 text-xs font-medium text-muted uppercase">URL</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted uppercase">Activated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredQRCodes.map((qr) => (
              <tr key={qr.nodeId} className="hover:bg-secondary">
                <td className="min-w-[200px] px-4 py-3 text-primary">
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
                      title={qr.activated ? "Click to deactivate" : "Click to activate"}
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
                    <Button variant="primary" onClick={() => onSelectQR({ url: qr.url, title: qr.title })}>Generate QR</Button>
                    <Button variant="secondary" onClick={() => onCopyUrl(qr.url)} className="hidden sm:flex">Copy URL</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredQRCodes.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No QR codes match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
