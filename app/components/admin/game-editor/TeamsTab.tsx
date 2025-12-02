import { Form } from "@remix-run/react";
import { Button } from "~/components/Button";
import { inputClasses, type Team, type Node } from "./types";

interface TeamsTabProps {
  teams: Team[];
  nodes: Node[];
  editingTeam: Team | null;
  setEditingTeam: (team: Team | null) => void;
  teamLogoUrl: string;
  setTeamLogoUrl: (url: string) => void;
  isSubmitting: boolean;
  onDelete: (type: "node" | "edge" | "team", id: string, name: string) => void;
  onCopyShareInfo: (team: Team) => void;
}

export function TeamsTab({
  teams,
  nodes,
  editingTeam,
  setEditingTeam,
  teamLogoUrl,
  setTeamLogoUrl,
  isSubmitting,
  onDelete,
  onCopyShareInfo,
}: TeamsTabProps) {
  const startNodes = nodes.filter((n) => n.isStart);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-elevated rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Team</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted uppercase">Start Node</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((team) => {
                const startNode = nodes.find((n) => n.id === team.startNodeId);
                return (
                  <tr key={team.id} className="hover:bg-secondary">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {team.logoUrl && <img src={team.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />}
                        <span className="text-primary font-medium">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="bg-secondary px-2 py-1 rounded text-[var(--color-primary)] text-sm">{team.code}</code>
                    </td>
                    <td className="px-4 py-3 text-secondary">{startNode?.title || "Default"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="secondary" size="small" onClick={() => onCopyShareInfo(team)}>Share</Button>
                        <Button variant="secondary" size="small" onClick={() => setEditingTeam(team)}>Edit</Button>
                        <Button variant="danger" size="small" onClick={() => onDelete("team", team.id, team.name)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {teams.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No teams yet. Create team codes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-elevated rounded-xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">{editingTeam ? "Edit Team" : "Add Team"}</h3>
        <Form method="post" onSubmit={() => { setEditingTeam(null); setTeamLogoUrl(""); }} className="space-y-4">
          <input type="hidden" name="_action" value={editingTeam ? "updateTeam" : "createTeam"} />
          {editingTeam && <input type="hidden" name="teamId" value={editingTeam.id} />}

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Team Name</label>
            <input type="text" name="teamName" className={inputClasses} required defaultValue={editingTeam?.name || ""} key={`name-${editingTeam?.id || "new"}`} />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Start Node</label>
            <select name="startNodeId" className={inputClasses} defaultValue={editingTeam?.startNodeId || ""} key={`start-${editingTeam?.id || "new"}`}>
              <option value="">Default (any start node)</option>
              {startNodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Logo URL</label>
            <input
              type="url"
              name="logoUrl"
              className={inputClasses}
              placeholder="https://example.com/logo.png"
              value={editingTeam ? (teamLogoUrl || editingTeam.logoUrl || "") : teamLogoUrl}
              onChange={(e) => setTeamLogoUrl(e.target.value)}
              key={`logo-${editingTeam?.id || "new"}`}
            />
          </div>

          {(teamLogoUrl || editingTeam?.logoUrl) && (
            <img
              src={teamLogoUrl || editingTeam?.logoUrl || ""}
              alt="Team logo preview"
              className="w-16 h-16 rounded-lg object-cover border border-border"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              onLoad={(e) => { e.currentTarget.style.display = "block"; }}
            />
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>{editingTeam ? "Update Team" : "Add Team"}</Button>
            {editingTeam && <Button variant="secondary" onClick={() => { setEditingTeam(null); setTeamLogoUrl(""); }}>Cancel</Button>}
          </div>
        </Form>
      </div>
    </div>
  );
}
