async function test() {
  const url = `https://gigaverse.io/api/racing/pets?ids=100`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.pets && data.pets.length > 0) {
      console.log(data.pets[0]);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
