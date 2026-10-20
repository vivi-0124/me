<script setup lang="ts">
import { Button } from "@/components/ui/button";
</script>

<template>
  <main class="mx-auto grid min-h-[80svh] max-w-2xl content-center px-4 text-center">
    <h1 class="font-serif text-2xl">ページが見つかりません</h1>
    <p class="mt-3 text-sm text-muted-foreground">
      リンクが途中で切れているかもしれません。送ってくれた人に、もう一度リンクをもらってください。
    </p>
    <div class="mt-6"><Button as-child variant="outline" size="lg" class="min-h-12 rounded-full"><RouterLink to="/">トップへ</RouterLink></Button></div>
  </main>
</template>
