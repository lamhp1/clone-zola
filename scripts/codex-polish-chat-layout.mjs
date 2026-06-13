import fs from "node:fs";

const appPath = "frontend/src/App.jsx";
const cssPath = "frontend/src/styles.css";

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Missing target: ${label}`);
  }
  return source.replace(search, replacement);
}

let app = fs.readFileSync(appPath, "utf8");

const friendsCardPattern = /            <Card bordered=\{false\} className="sideCard">\n              <Title level=\{5\}>Bạn bè & tạo nhóm<\/Title>\n([\s\S]*?)\n            <\/Card>\n\n            \{activeGroup \? \(/;
const friendsCardMatch = app.match(friendsCardPattern);
if (!friendsCardMatch) {
  throw new Error("Could not find friends/group card in right panel");
}

const friendsContent = friendsCardMatch[1].trimEnd();
app = app.replace(friendsCardPattern, "            {activeGroup ? (");

const collapsedFriendsPanel = `

            <details className="friendsDetails">
              <summary>
                <span>Bạn bè & tạo nhóm</span>
                <Tag>{friends.length}</Tag>
              </summary>
              <div className="friendsDetailsBody">
${friendsContent}
              </div>
            </details>`;

app = replaceOnce(
  app,
  `            </div>
          </aside>

          <section className="centerStage">`,
  `            </div>${collapsedFriendsPanel}
          </aside>

          <section className="centerStage">`,
  "insert collapsed friends panel"
);

fs.writeFileSync(appPath, app);

let css = fs.readFileSync(cssPath, "utf8");
css = replaceOnce(css, ".brandText {\n  min-width: 0;", ".brandText {\n  min-width: 0;\n  height: 48px;", "brand text height");
css = replaceOnce(css, ".brandText h3.ant-typography {\n  line-height: 1;", ".brandText h3.ant-typography {\n  line-height: 1.05;", "brand title line height");
css = replaceOnce(css, ".eyebrow {\n  display: block;", ".eyebrow {\n  display: block;\n  line-height: 1;", "eyebrow line height");
css = replaceOnce(
  css,
  `.reactionBar {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}`,
  `.reactionBar {
  position: absolute;
  left: 12px;
  bottom: -34px;
  z-index: 5;
  display: flex;
  gap: 4px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.bubble.mine .reactionBar {
  left: auto;
  right: 12px;
}`,
  "reaction bar overlay"
);
css = replaceOnce(
  css,
  `.bubble:hover .reactionBar,
.bubble:focus-within .reactionBar {
  opacity: 1;
  transform: translateY(0);
}`,
  `.bubble:hover .reactionBar,
.bubble:focus-within .reactionBar {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}`,
  "reaction pointer events"
);
css = replaceOnce(
  css,
  `.friendScroller {
  max-height: 190px;
  overflow-y: auto;
}`,
  `.friendScroller {
  max-height: 190px;
  overflow-y: auto;
}

.friendsDetails {
  border: 1px solid rgba(205, 218, 235, 0.74);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 44px rgba(35, 69, 109, 0.07);
  padding: 12px;
}

.friendsDetails summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #102033;
  font-weight: 800;
}

.friendsDetails summary::-webkit-details-marker {
  display: none;
}

.friendsDetails summary::after {
  content: "+";
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #0d5fc3;
  background: #eef6ff;
  font-weight: 900;
}

.friendsDetails[open] summary::after {
  content: "-";
}

.friendsDetailsBody {
  display: grid;
  gap: 12px;
  padding-top: 12px;
}

.friendsDetails .friendScroller {
  max-height: 155px;
}`,
  "collapsed friends css"
);

fs.writeFileSync(cssPath, css);
