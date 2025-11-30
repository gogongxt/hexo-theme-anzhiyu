(function () {
  const {
    randomNum,
    basicWordCount,
    btnLink,
    key: AIKey,
    Referer: AIReferer,
    gptName,
    switchBtn,
    mode: initialMode,
  } = GLOBAL_CONFIG.postHeadAiDescription;

  const { title, postAI, pageFillDescription } = GLOBAL_CONFIG_SITE;

  let lastAiRandomIndex = -1;
  let animationRunning = true;
  let mode = initialMode;
  let refreshNum = 0;
  let prevParam;
  let audio = null;
  let isPaused = false;
  let summaryID = null;

  const post_ai = document.querySelector(".post-ai-description");
  const aiTitleRefreshIcon = post_ai.querySelector(".ai-title .anzhiyufont.anzhiyu-icon-arrow-rotate-right");
  let aiReadAloudIcon = post_ai.querySelector(".anzhiyu-icon-circle-dot");
  const explanation = post_ai.querySelector(".ai-explanation");

  let aiStr = "";
  let aiStrLength = "";
  let delayInit = 50; // 减少初始延迟，立即开始显示
  let indexI = 0;
  let indexJ = 0;
  let timeouts = [];
  let elapsed = 0;

  // 移除延迟加载，立即开始显示
  const aiFunctions = [introduce, aiTitleRefreshIconClick, aiRecommend, aiGoHome];

  const aiBtnList = post_ai.querySelectorAll(".ai-btn-item");
  const filteredHeadings = Array.from(aiBtnList).filter(heading => heading.id !== "go-tianli-blog");
  filteredHeadings.forEach((item, index) => {
    item.addEventListener("click", () => {
      aiFunctions[index]();
    });
  });

  document.getElementById("ai-tag").addEventListener("click", onAiTagClick);
  aiTitleRefreshIcon.addEventListener("click", onAiTitleRefreshIconClick);
  document.getElementById("go-tianli-blog").addEventListener("click", () => {
    window.open(btnLink, "_blank");
  });
  aiReadAloudIcon.addEventListener("click", readAloud);

  async function readAloud() {
    if (!summaryID) {
      anzhiyu.snackbarShow("摘要还没加载完呢，请稍后。。。");
      return;
    }
    aiReadAloudIcon = post_ai.querySelector(".anzhiyu-icon-circle-dot");
    aiReadAloudIcon.style.opacity = "0.2";
    if (audio && !isPaused) {
      audio.pause();
      isPaused = true;
      aiReadAloudIcon.style.opacity = "1";
      aiReadAloudIcon.style.animation = "";
      aiReadAloudIcon.style.cssText = "animation: ''; opacity: 1;cursor: pointer;";
      return;
    }

    if (audio && isPaused) {
      audio.play();
      isPaused = false;
      aiReadAloudIcon.style.cssText = "animation: breathe .5s linear infinite; opacity: 0.2;cursor: pointer";
      return;
    }

    const options = {
      key: AIKey,
      Referer: AIReferer,
    };
    const requestParams = new URLSearchParams({
      key: options.key,
      id: summaryID,
    });

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: options.Referer,
      },
    };

    try {
      const response = await fetch(`https://summary.tianli0.top/audio?${requestParams}`, requestOptions);
      if (response.status === 403) {
        console.error("403 refer与key不匹配。");
      } else if (response.status === 500) {
        console.error("500 系统内部错误");
      } else {
        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);
        audio = new Audio(audioURL);
        audio.play();
        aiReadAloudIcon.style.cssText = "animation: breathe .5s linear infinite; opacity: 0.2;cursor: pointer";
        audio.addEventListener("ended", () => {
          audio = null;
          aiReadAloudIcon.style.opacity = "1";
          aiReadAloudIcon.style.animation = "";
        });
      }
    } catch (error) {
      console.error("请求发生错误❎");
    }
  }
  if (switchBtn) {
    document.getElementById("ai-Toggle").addEventListener("click", changeShowMode);
  }

  aiAbstract();
  showAiBtn();

  // 移除延迟加载，立即显示函数
  function startImmediateAnimation() {
    if (indexJ) {
      indexI = 0;
      indexJ = 0;
    }
    // 不显示初始字符，直接开始动画
    explanation.innerHTML = "";
    animationRunning = true;
    requestAnimationFrame(animate);
  }

  function animate(timestamp) {
    if (!animationRunning) {
      return;
    }
    if (!animate.start) animate.start = timestamp;
    elapsed = timestamp - animate.start;
    // 加快打字机速度
    if (elapsed >= 10) {
      animate.start = timestamp;
      if (indexI < aiStrLength) {
        let char = aiStr.charAt(indexI);
        // 调整标点符号延迟，从150ms减少到80ms
        let delay = /[,.，。!?！？]/.test(char) ? 20 : 10;
        // 先移除光标，再添加字符，最后添加光标（避免重复）
        if (explanation.lastElementChild && explanation.lastElementChild.className === "ai-cursor") {
          explanation.removeChild(explanation.lastElementChild);
        }
        explanation.innerHTML += char;
        let div = document.createElement("div");
        div.className = "ai-cursor";
        explanation.appendChild(div);
        indexI++;
        if (delay === 20) {
          let cursor = explanation.querySelector(".ai-cursor");
          if (cursor) cursor.style.opacity = "0.2";
        }
        if (indexI >= aiStrLength) {
          // 移除observer.disconnect()，因为没有使用observer
          let cursor = explanation.querySelector(".ai-cursor");
          if (cursor) explanation.removeChild(cursor);
          animationRunning = false;
          return;
        }
        timeouts[0] = setTimeout(() => {
          requestAnimationFrame(animate);
        }, delay);
      } else {
        requestAnimationFrame(animate);
      }
    } else {
      requestAnimationFrame(animate);
    }
  }

  function clearTimeouts() {
    if (timeouts.length) {
      timeouts.forEach(item => {
        if (item) {
          clearTimeout(item);
        }
      });
    }
  }

  function startAI(str, df = true) {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    // 不显示初始化文本，直接开始显示摘要内容
    explanation.innerHTML = "";
    aiStr = str;
    aiStrLength = aiStr.length;
    // 立即开始显示，不使用observer
    setTimeout(() => {
      startImmediateAnimation();
    }, 50); // 极短的延迟确保DOM更新完成
  }

  async function aiAbstract(num = basicWordCount) {
    if (mode === "tianli") {
      await aiAbstractTianli(num);
    } else {
      aiAbstractLocal();
    }
  }

  async function aiAbstractTianli(num) {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    // 移除observer.disconnect()，因为没有使用observer

    num = Math.max(10, Math.min(2000, num));
    const options = {
      key: AIKey,
      Referer: AIReferer,
    };
    const truncateDescription = (title + pageFillDescription).trim().substring(0, num);

    const requestBody = {
      key: options.key,
      content: truncateDescription,
      url: location.href,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: options.Referer,
      },
      body: JSON.stringify(requestBody),
    };
    console.info(truncateDescription.length);
    try {
      let animationInterval = null;
      let summary;
      if (animationInterval) clearInterval(animationInterval);
      animationInterval = setInterval(() => {
        const animationText = "生成中" + ".".repeat(indexJ);
        explanation.innerHTML = animationText;
        indexJ = (indexJ % 3) + 1;
      }, 500);
      const response = await fetch(`https://summary.tianli0.top/`, requestOptions);
      let result;
      if (response.status === 403) {
        result = {
          summary: "403 refer与key不匹配。",
        };
      } else if (response.status === 500) {
        result = {
          summary: "500 系统内部错误",
        };
      } else {
        result = await response.json();
      }

      summary = result.summary.trim();
      summaryID = result.id;

      setTimeout(() => {
        aiTitleRefreshIcon.style.opacity = "1";
      }, 300);
      if (summary) {
        startAI(summary);
      } else {
        startAI("摘要获取失败!!!请检查Tianli服务是否正常!!!");
      }
      clearInterval(animationInterval);
    } catch (error) {
      console.error(error);
      explanation.innerHTML = "发生异常" + error;
    }
  }

  function aiAbstractLocal() {
    const strArr = postAI.split(",").map(item => item.trim());
    if (strArr.length !== 1) {
      let randomIndex = Math.floor(Math.random() * strArr.length);
      while (randomIndex === lastAiRandomIndex) {
        randomIndex = Math.floor(Math.random() * strArr.length);
      }
      lastAiRandomIndex = randomIndex;
      startAI(strArr[randomIndex]);
    } else {
      startAI(strArr[0]);
    }
    // 减少刷新图标显示延迟
    setTimeout(() => {
      aiTitleRefreshIcon.style.opacity = "1";
    }, 200);
  }

  function aiRecommend() {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    explanation.innerHTML = "生成中. . .";
    aiStr = "";
    aiStrLength = "";
    // 移除observer.disconnect()，因为没有使用observer
    timeouts[2] = setTimeout(() => {
      explanation.innerHTML = recommendList();
    }, 600);
  }

  function recommendList() {
    let thumbnail = document.querySelectorAll(".relatedPosts-list a");
    if (!thumbnail.length) {
      const cardRecentPost = document.querySelector(".card-widget.card-recent-post");
      if (!cardRecentPost) return "";

      thumbnail = cardRecentPost.querySelectorAll(".aside-list-item a");

      let list = "";
      for (let i = 0; i < thumbnail.length; i++) {
        const item = thumbnail[i];
        list += `<div class="ai-recommend-item"><span class="index">${i + 1
          }：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title
          }" data-pjax-state="">${item.title}</a></div>`;
      }

      return `很抱歉，无法找到类似的文章，你也可以看看本站最新发布的文章：<br /><div class="ai-recommend">${list}</div>`;
    }

    let list = "";
    for (let i = 0; i < thumbnail.length; i++) {
      const item = thumbnail[i];
      list += `<div class="ai-recommend-item"><span>推荐${i + 1
        }：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title
        }" data-pjax-state="">${item.title}</a></div>`;
    }

    return `推荐文章：<br /><div class="ai-recommend">${list}</div>`;
  }

  function aiGoHome() {
    startAI("正在前往博客主页...", false);
    timeouts[2] = setTimeout(() => {
      if (window.pjax) {
        pjax.loadUrl("/");
      } else {
        location.href = location.origin;
      }
    }, 1000);
  }

  function introduce() {
    if (mode == "tianli") {
      startAI("我是文章辅助AI: TianliGPT，点击下方的按钮，让我生成本文简介、推荐相关文章等。");
    } else {
      startAI(`我是文章辅助AI: ${gptName} GPT，点击下方的按钮，让我生成本文简介、推荐相关文章等。`);
    }
  }

  function aiTitleRefreshIconClick() {
    aiTitleRefreshIcon.click();
  }

  function onAiTagClick() {
    if (mode === "tianli") {
      post_ai.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "none"));
      document.getElementById("go-tianli-blog").style.display = "block";
      startAI(
        "你好，我是Tianli开发的摘要生成助理TianliGPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通，如果你也需要一个这样的AI摘要接口，可以在下方购买。"
      );
    } else {
      post_ai.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "block"));
      document.getElementById("go-tianli-blog").style.display = "none";
      startAI(
        `你好，我是本站摘要生成助理${gptName} GPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通。`
      );
    }
  }

  function onAiTitleRefreshIconClick() {
    const truncateDescription = (title + pageFillDescription).trim().substring(0, basicWordCount);

    aiTitleRefreshIcon.style.opacity = "0.2";
    aiTitleRefreshIcon.style.transitionDuration = "0.3s";
    aiTitleRefreshIcon.style.transform = "rotate(" + 360 * refreshNum + "deg)";
    if (truncateDescription.length <= basicWordCount) {
      let param = truncateDescription.length - Math.floor(Math.random() * randomNum);
      while (param === prevParam || truncateDescription.length - param === prevParam) {
        param = truncateDescription.length - Math.floor(Math.random() * randomNum);
      }
      prevParam = param;
      aiAbstract(param);
    } else {
      let value = Math.floor(Math.random() * randomNum) + basicWordCount;
      while (value === prevParam || truncateDescription.length - value === prevParam) {
        value = Math.floor(Math.random() * randomNum) + basicWordCount;
      }
      aiAbstract(value);
    }
    refreshNum++;
  }

  function changeShowMode() {
    mode = mode === "tianli" ? "local" : "tianli";
    if (mode === "tianli") {
      document.getElementById("ai-tag").innerHTML = "TianliGPT";

      aiReadAloudIcon.style.opacity = "1";
      aiReadAloudIcon.style.cursor = "pointer";
    } else {
      aiReadAloudIcon.style.opacity = "0";
      aiReadAloudIcon.style.cursor = "auto";
      if ((document.getElementById("go-tianli-blog").style.display = "block")) {
        document.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "block"));
        document.getElementById("go-tianli-blog").style.display = "none";
      }
      document.getElementById("ai-tag").innerHTML = gptName + " GPT";
    }
    aiAbstract();
  }

  function showAiBtn() {
    if (mode === "tianli") {
      document.getElementById("ai-tag").innerHTML = "TianliGPT";
    } else {
      document.getElementById("ai-tag").innerHTML = gptName + " GPT";
    }
  }
})();
