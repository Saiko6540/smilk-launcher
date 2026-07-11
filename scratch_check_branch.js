
async function check() {
  const res = await fetch(`https://api.github.com/repos/ddidif/submarinemilkkk/commits?sha=vanilla%2B&per_page=1`);
  const json = await res.json();
  console.log(JSON.stringify(json[0].commit, null, 2));
}
check();
