const loginForm = document.getElementById("loginForm");

if (!loginForm) {
    throw new Error("form not found");
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const el = document.body;

    const form = e.currentTarget as HTMLFormElement;
    if (!form) {
        throw new Error("form not found");
    }
    const emailorid =
        (form.elements.namedItem("emailorid") as HTMLInputElement).value;
    const password =
        (form.elements.namedItem("password") as HTMLInputElement).value;
    const data = {
        emailorid: emailorid,
        password: password,
    };

    const res = await fetch(el.dataset.apiUrl + "api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
    });

    if (res.ok) {
        window.location.href = "/";
    }

    const result = await res.json();

    if (result.error == "Invalid request") {
        window.location.href = "/error";
        return;
    } else {
        const errorMsg = document.getElementById("errorMsg");
        if (!errorMsg) throw new Error("errorMsg element not found");
        errorMsg.textContent = result.error;
    }
});
