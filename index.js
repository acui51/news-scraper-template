import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";

const supabase = createClient(
  "https://nvpoxnhyhnoxikpasiwv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cG94bmh5aG5veGlrcGFzaXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzQ3ODAyODgsImV4cCI6MTk5MDM1NjI4OH0.-aCVYj85FKsW48DPlHsG8X2Xk3HTHnJsl2t3o0fg55c"
);

const webScrape = async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto("https://www.wsj.com/", {
    waitUntil: "load",
    timeout: 0,
  });

  // Set screen size
  await page.setViewport({ width: 1080, height: 1024 });

  const articleSelector = `[data-index]`; // TODO: change
  await page.waitForSelector(articleSelector);

  const articleBoundingBoxes = await page.evaluate(async () => {
    const boundingBoxes = [];

    const articles = document.querySelectorAll(`[data-index]`); // TODO: change
    for (let i = 0; i < articles.length; i++) {
      if (i > 10) {
        break;
      }
      const article = articles[i];
      article.scrollIntoView({
        behavior: "auto",
        block: "center",
        inline: "center",
      });
      await new Promise((r) => setTimeout(r, 300));
      const boundingBox = article.getBoundingClientRect();
      let row = {};
      // TODO: change below
      const headline = article.querySelector(".headline");
      const headlineText = article.querySelector(".headline span");
      const headlineNextSibling = headline.nextSibling;
      if (
        headlineNextSibling &&
        !headlineNextSibling.classList.contains("byline")
      ) {
        // Next sibling is a description
        const descriptionSpan = headlineNextSibling.querySelector("span");
        row.description = descriptionSpan.innerText;
      }
      row = {
        ...row,
        ...{
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
          scroll: window.scrollY,
          dataAttr: article.getAttribute("data-index"),
          title: headlineText.innerText,
        },
      };
      boundingBoxes.push(row);
    }
    return boundingBoxes;
  });

  await page.evaluate(() => {
    window.scroll(0, 0);
  });
  for (let i = 0; i < 10; i++) {
    const article = articleBoundingBoxes[i];
    await page.evaluate((article) => {
      window.scroll(0, article.scroll);
      document.querySelector(
        `[data-index='${article.dataAttr}']`
      ).style.border = `5px solid red`;
    }, article);

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
    });

    // const { data, error } = await supabase
    //   .from("homepage-news")
    //   .insert({
    //     source_id: "the-washington-post",
    //     title: article.title,
    //     height: article.height,
    //     width: article.width,
    //   })
    //   .select();

    // await supabase.storage
    //   .from("washington-post-screenshots")
    //   .upload(`the-washington-post/${data[0].id}.jpeg`, screenshotBuffer, {
    //     contentType: "image/jpeg",
    //   });

    await page.evaluate((article) => {
      document.querySelector(
        `[data-index='${article.dataAttr}']`
      ).style.border = "none";
    }, article);
  }

  await browser.close();
};

export const handler = async (event) => {
  await webScrape();
  return;
};

handler();
