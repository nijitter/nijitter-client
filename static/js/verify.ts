const signupForm = document.getElementById("signupForm");
if (!signupForm) throw new Error("form not found");
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const el = document.body;

    const form = e.currentTarget as HTMLFormElement;
    if (!form) throw new Error("form not found");
    const data = {
        token: token,
        password: form.password.value,
        userid: form.user_id.value,
        username: form.username.value,
    };

    const res = await fetch(el.dataset.apiUrl + "api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
    });

    if (res.ok) {
        window.location.href = "/";
        return;
    }

    const result = await res.json();

    if (result.error == "Invalid request") {
        window.location.href = "/error";
        return;
    } else {
        const errorMsg = document.getElementById("errorMsg");
        if (!errorMsg) throw new Error("errorMsg not found");
        errorMsg.textContent = result.error + result.details;
    }
});
