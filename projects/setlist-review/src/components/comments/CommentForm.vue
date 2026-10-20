<script setup lang="ts">
import { computed, ref } from "vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEventComments } from "@/composables/useEventComments";
import { nickname } from "@/lib/store";

const props = defineProps<{ target: string; placeholder: string }>();
const ctx = useEventComments()!;

const body = ref("");
const nameDraft = ref("");
// 名前を一度入れたら、次からは「〇〇 として書きます」だけ出す（ほかのコメント欄も同じ）
const forceEditName = ref(false);
const editingName = computed(() => forceEditName.value || !nickname.value);
const sending = ref(false);
const error = ref("");
const nameId = `name-${props.target}`;
const bodyId = `body-${props.target}`;

function changeName() {
  nameDraft.value = nickname.value;
  forceEditName.value = true;
}

async function submit() {
  error.value = "";
  const author = (editingName.value ? nameDraft.value : nickname.value).trim();
  if (!author) return void (error.value = "ニックネームを入れてください");
  if (!body.value.trim()) return void (error.value = "コメントを書いてください");

  sending.value = true;
  try {
    await ctx.post(props.target, author, body.value);
    nickname.value = author;
    forceEditName.value = false;
    body.value = "";
    toast.success("コメントしました");
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <form class="grid gap-2.5 p-4" @submit.prevent="submit">
    <div v-if="editingName" class="grid gap-1.5">
      <Label :for="nameId" class="text-xs text-muted-foreground">ニックネーム</Label>
      <Input :id="nameId" v-model="nameDraft" maxlength="30" placeholder="例: みー" autocomplete="nickname" class="h-12" />
    </div>
    <p v-else class="text-[0.82rem] text-muted-foreground">
      {{ nickname }} として書きます
      <button type="button" class="ml-2 min-h-8 text-primary underline" @click="changeName">名前を変える</button>
    </p>
    <Label :for="bodyId" class="sr-only">コメント</Label>
    <Textarea :id="bodyId" v-model="body" maxlength="1000" :placeholder rows="3" class="min-h-24" />
    <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
    <div class="flex justify-end">
      <Button type="submit" size="lg" class="min-h-12 rounded-full px-6 font-bold" :disabled="sending">
        {{ sending ? "送信中…" : "コメントする" }}
      </Button>
    </div>
  </form>
</template>
