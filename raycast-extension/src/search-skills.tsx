import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
  trash,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { dirname } from "node:path";
import { Skill, loadSkills, skillsRoot } from "./lib/skills";
import { exportSkillZip, stageSkillZip } from "./lib/zip";

export default function Command() {
  const { data: skills, isLoading, revalidate } = useCachedPromise(loadSkills, []);
  const root = skillsRoot();

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search skills...">
      <List.EmptyView
        icon={Icon.Folder}
        title={isLoading ? "読み込み中..." : "skill がありません"}
        description={root}
      />
      <List.Section title={`User (${root})`} subtitle={skills ? `${skills.length}` : undefined}>
        {skills?.map((skill) => (
          <List.Item
            key={skill.id}
            icon={skill.parseError ? { source: Icon.Warning, tintColor: Color.Yellow } : Icon.Book}
            title={skill.dirName}
            // description は右ペインで読めるので、左は名前だけにする（検索では keywords 経由で引っかかる）
            keywords={skill.description?.split(/\s+/)}
            detail={<SkillDetail skill={skill} />}
            actions={<SkillActions skill={skill} onChange={revalidate} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SkillDetail({ skill }: { skill: Skill }) {
  const frontmatterName = skill.frontmatter.name;
  const nameMismatch = frontmatterName !== undefined && frontmatterName !== skill.dirName;
  // name は左のリストで出しているので、右にはそれ以外を並べる
  const entries = Object.entries(skill.frontmatter).filter(([key]) => key !== "name");

  return (
    <List.Item.Detail
      markdown={skill.body || "_(本文なし)_"}
      metadata={
        <List.Item.Detail.Metadata>
          {entries.map(([key, value]) => (
            <List.Item.Detail.Metadata.Label key={key} title={key} text={value || "-"} />
          ))}
          {entries.length > 0 && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label title="Path" text={skill.dirPath} />
          {nameMismatch && (
            <List.Item.Detail.Metadata.TagList title="Warning">
              <List.Item.Detail.Metadata.TagList.Item
                text={`frontmatter の name (${frontmatterName}) がディレクトリ名と違います`}
                color={Color.Yellow}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {skill.parseError && (
            <List.Item.Detail.Metadata.Label title="Parse Error" text={skill.parseError} icon={Icon.Warning} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SkillActions({ skill, onChange }: { skill: Skill; onChange: () => void }) {
  const slashCommand = `/${skill.dirName}`;

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Skill",
      message: `${skill.dirPath} をゴミ箱に移動します。`,
      icon: Icon.Trash,
      primaryAction: { title: "ゴミ箱に移動", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await trash(skill.dirPath);
      await showToast({ style: Toast.Style.Success, title: "ゴミ箱に移動しました", message: skill.dirName });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "削除に失敗しました" });
    }
  }

  async function handleExportZip() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "zip を作成中..." });
    try {
      const zipPath = await exportSkillZip(skill.dirPath, skill.dirName);
      toast.style = Toast.Style.Success;
      toast.title = "zip を書き出しました";
      toast.message = zipPath;
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: () => open(dirname(zipPath)),
      };
    } catch (error) {
      await showFailureToast(error, { title: "zip の作成に失敗しました" });
    }
  }

  async function handleCopyZip() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "zip を作成中..." });
    try {
      const zipPath = await stageSkillZip(skill.dirPath, skill.dirName);
      await Clipboard.copy({ file: zipPath });
      toast.style = Toast.Style.Success;
      toast.title = "zip をクリップボードにコピーしました";
      toast.message = "貼り付け先にファイルとして添付されます";
    } catch (error) {
      await showFailureToast(error, { title: "zip の作成に失敗しました" });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Paste title="Paste Slash Command" icon={Icon.Terminal} content={slashCommand} />
        {/* パネルの 2 番目なので Cmd+Enter は Raycast が自動で割り当てる */}
        <Action.CopyToClipboard title="Copy Slash Command" content={slashCommand} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Skill Path"
          icon={Icon.Folder}
          content={skill.dirPath}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.Paste
          title="Paste Skill Path"
          icon={Icon.Folder}
          content={skill.dirPath}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
        <Action.CopyToClipboard
          title="Copy Skill Contents"
          icon={Icon.Document}
          content={skill.raw}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        />
        <Action.Paste
          title="Paste Skill Contents"
          icon={Icon.Document}
          content={skill.raw}
          shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Export as Zip"
          icon={Icon.Download}
          onAction={handleExportZip}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
        <Action
          title="Copy Zip to Clipboard"
          icon={Icon.Clipboard}
          onAction={handleCopyZip}
          shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Skill"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDelete}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
