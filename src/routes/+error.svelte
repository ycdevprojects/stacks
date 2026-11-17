<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Stackr</title></svelte:head>

<div class="grid min-h-[70dvh] place-items-center px-6 text-center">
	<div>
		<div class="mb-4 text-5xl">{page.status === 404 ? '🧭' : '😵'}</div>
		<h1 class="text-xl font-bold text-white">{page.status === 404 ? 'Nothing here' : 'Something went wrong'}</h1>
		<p class="mt-2 text-[15px] text-slate-400">{page.status === 404 ? 'That screen doesn’t exist.' : (page.error?.message ?? '')}</p>
		<a href="/" class="btn-primary mt-6 inline-block">Back to Today</a>
	</div>
</div>
