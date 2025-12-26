let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

async function refresh() {
    if (refreshPromise) return refreshPromise;

    const el = document.body;

    refreshPromise = (async () => {
        const res = await fetch(el.dataset.apiUrl + "api/auth/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (res.status === 401) {
            window.location.href = "/login";
            throw new Error("refresh failed");
        }

        const data = await res.json();
        if (!data.access_token) {
            throw new Error("no access token");
        }

        accessToken = data.access_token;
    })();

    try {
        await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

async function userFetch() {
    const el = document.body;

    if (!accessToken) {
        await refresh();
        if (!accessToken) return;
    }

    const res = await fetch(el.dataset.apiUrl + "api/carrot/user/" + el.dataset.userId, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        method: "GET",
        credentials: "include",
    });

    if (res.status === 401) {
        window.location.href = "/login";
        return;
    }

    const data = await res.json();

    if (data.carrots.length === 0) {
        const loader = document.getElementById("loader");
        if (!loader) throw new Error("loader not found");
        loader.textContent = "end";
        return data;
    }

    const timeline = document.getElementById("timeline");
    if (!timeline) throw new Error("timeline not found");

    for (const post of data.carrots) {
        const div = document.createElement("div");
        div.className = "carrot";
        div.textContent = post.content + " by: " + post.username;
        timeline.appendChild(div);
    }

    return data;
}

userFetch();
