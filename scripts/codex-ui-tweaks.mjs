import fs from "node:fs";

const appPath = "frontend/src/App.jsx";
const cssPath = "frontend/src/styles.css";

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Missing target: ${label}`);
  }

  return source.replace(search, replacement);
}

const stickerBlock = `const stickerItems = [
  {
    label: "Cười tươi",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Grinning%20face/3D/grinning_face_3d.png"
  },
  {
    label: "Cười ra nước mắt",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20with%20tears%20of%20joy/3D/face_with_tears_of_joy_3d.png"
  },
  {
    label: "Mặt cười tim",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20face%20with%20hearts/3D/smiling_face_with_hearts_3d.png"
  },
  {
    label: "Hôn gió",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Face%20blowing%20a%20kiss/3D/face_blowing_a_kiss_3d.png"
  },
  {
    label: "Ôm nè",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hugging%20face/3D/hugging_face_3d.png"
  },
  {
    label: "Mắt long lanh",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pleading%20face/3D/pleading_face_3d.png"
  },
  {
    label: "Mắt sao",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Star-struck/3D/star-struck_3d.png"
  },
  {
    label: "Pháo giấy",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Party%20popper/3D/party_popper_3d.png"
  },
  {
    label: "Lửa",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png"
  },
  {
    label: "Lấp lánh",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sparkles/3D/sparkles_3d.png"
  },
  {
    label: "Trái tim",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20heart/3D/red_heart_3d.png"
  },
  {
    label: "Nơ hồng",
    url: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Ribbon/3D/ribbon_3d.png"
  }
];`;

let app = fs.readFileSync(appPath, "utf8");
app = replaceOnce(app, 'import { useEffect, useMemo, useRef, useState } from "react";', 'import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";', "React import");
app = replaceOnce(app, "  Divider,\n  Empty,", "  Divider,\n  Dropdown,\n  Empty,", "Dropdown import");
app = app.replace(/const stickerItems = \[[\s\S]*?\n\];\n\nfunction avatarUrl/, `${stickerBlock}\n\nfunction avatarUrl`);
app = replaceOnce(
  app,
  `  useEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, activeConversation?.id]);`,
  `  useLayoutEffect(() => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, activeConversation?.id]);`,
  "instant message positioning"
);
app = replaceOnce(app, '<div>\n                <Text className="eyebrow">Realtime workspace</Text>', '<div className="brandText">\n                <Text className="eyebrow">Realtime workspace</Text>', "brand text alignment");
app = replaceOnce(
  app,
  `
            <form className="searchForm" onSubmit={handleSearch}>
              <Input.Search
                allowClear
                size="large"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onSearch={() => refreshSearch().catch((error) => setNotice(error.message))}
                placeholder="Tìm Gmail, userCode hoặc tên gợi nhớ"
              />
            </form>
`,
  "\n",
  "remove left search"
);
app = replaceOnce(
  app,
  `                <div className="stickerDock">
                  {stickerItems.map((sticker) => (
                    <Tooltip title="Gửi sticker" key={sticker.url}>
                      <button
                        type="button"
                        className="stickerButton"
                        onClick={() => sendPayload(sticker.url, "sticker")}
                      >
                        <img src={sticker.url} alt={sticker.label} />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <form className="composerForm" onSubmit={sendMessage}>
                  <Input`,
  `                <form className="composerForm" onSubmit={sendMessage}>
                  <Dropdown
                    trigger={["click"]}
                    placement="topLeft"
                    dropdownRender={() => (
                      <div className="stickerPicker">
                        {stickerItems.map((sticker) => (
                          <Tooltip title={sticker.label} key={sticker.url}>
                            <button
                              type="button"
                              className="stickerButton"
                              onClick={() => sendPayload(sticker.url, "sticker")}
                            >
                              <img src={sticker.url} alt={sticker.label} />
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  >
                    <Button size="large" type="default" htmlType="button">
                      Sticker
                    </Button>
                  </Dropdown>
                  <Input`,
  "sticker dropdown"
);
app = replaceOnce(
  app,
  `            <Card bordered={false} className="sideCard">
              <Title level={5}>Tìm bạn bè</Title>
              <List`,
  `            <Card bordered={false} className="sideCard">
              <Title level={5}>Tìm bạn bè</Title>
              <form className="searchForm" onSubmit={handleSearch}>
                <Input.Search
                  allowClear
                  size="large"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onSearch={() => refreshSearch().catch((error) => setNotice(error.message))}
                  placeholder="Tìm Gmail, userCode hoặc tên gợi nhớ"
                />
              </form>
              <List`,
  "right search"
);
fs.writeFileSync(appPath, app);

let css = fs.readFileSync(cssPath, "utf8");
css = replaceOnce(css, "  padding: 10px 4px 4px;", "  padding: 8px 4px 4px;", "brand padding");
css = replaceOnce(
  css,
  `.brandMark {
  width: 48px;`,
  `.brandMark {
  width: 48px;`,
  "brand mark anchor"
);
css = replaceOnce(
  css,
  `.eyebrow {
  display: block;`,
  `.brandText {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 2px;
}

.brandText h3.ant-typography {
  line-height: 1;
}

.eyebrow {
  display: block;`,
  "brand text css"
);
css = replaceOnce(css, `.searchForm {
  display: block;
}`, `.searchForm {
  display: block;
  margin-bottom: 14px;
}`, "search margin");
css = css.replace("  scroll-behavior: smooth;\n", "");
css = replaceOnce(
  css,
  `.composer {
  display: grid;
  gap: 12px;
  padding: 14px 18px 18px;`,
  `.composer {
  display: block;
  padding: 10px 16px 12px;`,
  "composer compact"
);
css = replaceOnce(
  css,
  `.stickerDock {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}`,
  `.stickerPicker {
  width: 286px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(205, 218, 235, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 46px rgba(35, 69, 109, 0.16);
}`,
  "sticker picker css"
);
css = replaceOnce(css, `.composerForm {
  grid-template-columns: 1fr auto;
}`, `.composerForm {
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}`, "composer columns");
fs.writeFileSync(cssPath, css);
