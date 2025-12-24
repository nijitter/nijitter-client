const emailForm = document.getElementById("emailForm");

if (!emailForm) {
    throw new Error("form not found");
}

emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const code = params.get("code");
    const el = document.body;

    const form = e.currentTarget as HTMLFormElement;
    if (!form) throw new Error("form not found");
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const data = {
        email: email,
        token: token,
        code: code,
    };

    const res = await fetch(el.dataset.apiUrl + "api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (res.ok) {
        window.location.href = "/success";
    }

    const result = await res.json();

    if (result.error == "Invalid request") {
        window.location.href = "/error";
        return;
    } else {
        const errorMsg = document.getElementById("errorMsg");

        if (!errorMsg) {
            throw new Error("errorMsg element not found");
        }

        errorMsg.textContent = result.error;
    }
});
