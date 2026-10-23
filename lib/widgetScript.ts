export function scriptableWidget(feedUrl: string, appUrl: string): string {
  return `// GoTyme Tracker widget for Scriptable (iPhone)
const FEED = "${feedUrl}";
const APP = "${appUrl}";
const d = await new Request(FEED).loadJSON();
const w = new ListWidget();
w.backgroundColor = new Color("#C6F432");
w.url = APP;
const ink = new Color("#14151A");
const top = w.addText(d.days_to_start > 0 ? d.days_to_start + " days to Day 1" : "Day " + (1 - d.days_to_start));
top.font = Font.semiboldSystemFont(12); top.textColor = ink;
w.addSpacer(6);
const lab = w.addText("NEXT UP"); lab.font = Font.boldSystemFont(10); lab.textColor = ink; lab.textOpacity = 0.7;
const nx = w.addText(d.next ? d.next.action : "Nothing needs you");
nx.font = Font.boldSystemFont(16); nx.textColor = ink; nx.minimumScaleFactor = 0.6; nx.lineLimit = 3;
w.addSpacer();
const foot = w.addText(d.done + " of " + d.total + " ready" + (d.due_today ? " · " + d.due_today + " due today" : "") + (d.clocked_in ? " · in since " + d.clocked_in.slice(0,5) : ""));
foot.font = Font.mediumSystemFont(11); foot.textColor = ink;
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
if (config.runsInWidget) Script.setWidget(w); else w.presentSmall();
Script.complete();
`;
}
