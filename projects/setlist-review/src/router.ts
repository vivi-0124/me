import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./pages/HomePage.vue") },
    { path: "/new", component: () => import("./pages/EditPage.vue") },
    { path: "/e/:slug", component: () => import("./pages/EventPage.vue"), props: true },
    { path: "/e/:slug/edit", component: () => import("./pages/EditPage.vue"), props: true },
    { path: "/:rest(.*)*", component: () => import("./pages/NotFoundPage.vue") },
  ],
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash } : { top: 0 }),
});
