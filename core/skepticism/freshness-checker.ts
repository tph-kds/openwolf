import * as fs from "node:fs";
import * as path from "node:path";

export interface FreshnessReport {
  cerebrumHours: number;
  cerebrumEntryCount: number;
  isFresh: boolean;
  needsUpdate: boolean;
  message: string | null;
}

export function checkCerebrumFreshness(wolfDir: string, significantActivity: boolean): FreshnessReport {
  const cerebrumPath = path.join(wolfDir, "cerebrum.md");

  try {
    const cerebrumContent = fs.readFileSync(cerebrumPath, "utf-8");
    const stat = fs.statSync(cerebrumPath);
    const hoursSinceUpdate = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

    const entryLines = cerebrumContent.split("\n").filter((l) => {
      const t = l.trim();
      return t.startsWith("- ") || t.startsWith("* ") || (t.startsWith("[") && t.includes("]"));
    });

    const report: FreshnessReport = {
      cerebrumHours: hoursSinceUpdate,
      cerebrumEntryCount: entryLines.length,
      isFresh: hoursSinceUpdate < 24,
      needsUpdate: false,
      message: null,
    };

    if (entryLines.length < 3) {
      report.needsUpdate = true;
      report.message = `cerebrum.md has only ${entryLines.length} entries. Learn from this session — record user preferences, project conventions, and mistakes.`;
    } else if (hoursSinceUpdate > 24 && significantActivity) {
      report.needsUpdate = true;
      report.message = `cerebrum.md hasn't been updated in ${Math.floor(hoursSinceUpdate)}h. Look for opportunities to add learnings.`;
    } else if (hoursSinceUpdate > 72) {
      report.needsUpdate = true;
      report.isFresh = false;
      report.message = `cerebrum.md hasn't been updated in ${Math.floor(hoursSinceUpdate)}h (${Math.floor(hoursSinceUpdate / 24)} days). Consider reviewing for staleness.`;
    }

    return report;
  } catch {
    return {
      cerebrumHours: Infinity,
      cerebrumEntryCount: 0,
      isFresh: false,
      needsUpdate: true,
      message: "cerebrum.md does not exist. Record learnings from this session.",
    };
  }
}

export function isBugLogEmpty(wolfDir: string): boolean {
  try {
    const buglogPath = path.join(wolfDir, "buglog.json");
    if (!fs.existsSync(buglogPath)) return true;
    const buglog = JSON.parse(fs.readFileSync(buglogPath, "utf-8")) as { bugs: unknown[] };
    return buglog.bugs.length === 0;
  } catch {
    return true;
  }
}
