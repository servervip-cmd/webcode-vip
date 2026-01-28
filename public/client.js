/* ===== Detect iOS keyboard and lift toolbar ===== */
if (window.visualViewport) {
  const vv = window.visualViewport;

  function adjustForKeyboard() {
    const keyboardHeight = window.innerHeight - vv.height;

    if (keyboardHeight > 150) {
      document.body.classList.add("keyboard-open");
      document.getElementById("toolbar").style.transform =
        `translateY(-${keyboardHeight}px)`;
    } else {
      document.body.classList.remove("keyboard-open");
      document.getElementById("toolbar").style.transform = "translateY(0)";
    }

    resizeTerm();
  }

  vv.addEventListener("resize", adjustForKeyboard);
}
