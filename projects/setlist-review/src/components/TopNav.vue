<script setup lang="ts">
defineProps<{ to: string; label: string }>();
</script>

<template>
  <nav class="absolute top-[env(safe-area-inset-top)] left-0 z-10 px-4 py-3 text-[0.82rem] sm:px-6">
    <RouterLink :to class="text-muted-foreground no-underline">← {{ label }}</RouterLink>
  </nav>
</template>
