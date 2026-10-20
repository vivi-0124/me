<script setup lang="ts">
import { Toaster } from "@/components/ui/sonner";
</script>

<template>
  <!-- 別のライブのページへ移ったとき、作り直す -->
  <RouterView :key="$route.path" />
  <Toaster position="bottom-center" :offset="{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }" />
</template>
