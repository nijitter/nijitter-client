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

const carrotForm = document.getElementById("carrotForm");

if (!carrotForm) throw new Error("refresh failed");

carrotForm.addEventListener(
    "submit",
    async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        if (!form) {
            throw new Error("form not found");
        }
        const data = {
            content: form.content.value,
        };

        if (!accessToken) {
            await refresh();
            if (!accessToken) return;
        }

        const el = document.body;

        const res = await fetch(el.dataset.apiUrl + "api/carrot/carrot", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            credentials: "include",
            body: JSON.stringify(data),
        });

        if (res.ok) {
            window.location.href = "/";
            return
        }

        const result = await res.json();

        if (result.error == "Invalid request") {
            window.location.href = "/error";
            return;
        } else {
            const errorMsg = document.getElementById("errorMsg")
            if (!errorMsg) {
                throw new Error("form not found");
            }
            errorMsg.textContent = result.error;
        }
    },
);
