import { useNavigation } from "@raycast/api";
import Editor from "./components/Editor";
import NoteList from "./components/NoteList";

export default function Command() {
  const { push } = useNavigation();
  return (
    <NoteList
      onOpen={(path, refresh) => push(<Editor initialPath={path} />, refresh)}
      onCreate={() => push(<Editor startNew />)}
    />
  );
}
