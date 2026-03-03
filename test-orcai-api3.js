async function main() {
    const res = await fetch("https://cc.orcai.cc/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": "Bearer cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gemini-2.5-flash-lite",
            messages: [{role: "user", content: "hello"}]
        })
    });
    console.log(res.status, await res.text());
}
main()
