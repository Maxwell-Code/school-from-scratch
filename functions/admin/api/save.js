export async function onRequestPost(context) {
  const OWNER = "univyrsal";
  const REPO  = "school-from-scratch";
  const PATH  = "cms-test.txt";           // throwaway test file

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const headers = {
    "Authorization": `Bearer ${context.env.CMS_GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "site-cms",
  };

  // 1. Get the file's current sha (404 = doesn't exist yet)
  let sha;
  const getRes = await fetch(url, { headers });
  if (getRes.ok) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    return new Response(`GET failed: ${getRes.status}\n${await getRes.text()}`, { status: getRes.status });
  }

  // 2. Write a timestamp so every run is a real change
  const putRes = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "CMS test write",
      content: btoa(`test write at ${new Date().toISOString()}\n`),
      sha,
    }),
  });

  return new Response(`PUT ${putRes.status}\n${await putRes.text()}`, { status: putRes.status });
}
