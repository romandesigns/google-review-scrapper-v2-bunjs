import puppeteer from "puppeteer";

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Set to false to see the navigation
      executablePath: "/usr/bin/chromium-browser", // Path to your Chromium or Chrome executable
    });
    const page = await browser.newPage();
    await page.goto("https://www.google.com/maps");

    // Search for the place
    const inputSearch = await page.waitForSelector("input[name=q]");
    await inputSearch.type("Hotel La Casona Gran Imperial");
    await page.keyboard.press("Enter");

    // Wait for the search results to load
    await page.waitForNavigation();

    // Extract the title and review information
    const businessTitle = await page.$eval("h1.DUwDvf", (el) => el.textContent);
    const baseReviewElement = ".fontBodyMedium > .ObqRqd + .F7nice";
    const ratings = await page.$eval(
      `${baseReviewElement} > span > span`,
      (el) => el.textContent
    );
    const totalReviewsCount = parseInt(
      await page.$eval(
        `${baseReviewElement} > span + span > span > span`,
        (el) => el.textContent.replace(/[()]/g, "")
      ),
      10
    );

    // Click on the reviews tab if available
    if (ratings && businessTitle && totalReviewsCount) {
      await page.$eval(".RWPxGd button:nth-child(3)", (el) => el.click());
    }

    await page.waitForNavigation();

    let loadedReviewsCount = 0;

    // Function to scroll to the bottom of the reviews container
    const loadMoreReviews = async () => {
      let lastReviewCount = 0;
      let currentReviewCount = await page.$$eval(
        "[data-review-id]",
        (reviews) => reviews.length
      );
      let attempts = 0; // To prevent infinite loops

      while (attempts < 5) {
        // Give a few attempts to load more reviews
        await page.evaluate(() => {
          const reviewsContainer = document.querySelector(
            "[class*='m6QErb DxyBCb kA9KIf dS8AEf']"
          );
          if (reviewsContainer) {
            reviewsContainer.scrollBy(0, 1000); // Adjust scroll step as needed
          }
        });

        // Wait for any new reviews to load
        await new Promise((resolve) => setTimeout(resolve, 2500)); // Adjust based on observed load times

        const newReviewCount = await page.$$eval(
          "[data-review-id]",
          (reviews) => reviews.length
        );
        if (newReviewCount > currentReviewCount) {
          lastReviewCount = currentReviewCount;
          currentReviewCount = newReviewCount;
          attempts = 0; // Reset attempts after successful load
        } else {
          // Increment attempts if no new reviews were loaded
          attempts++;
        }
      }
    };

    await loadMoreReviews();
    // Loop to keep scrolling until all reviews are loaded
    while (loadedReviewsCount < totalReviewsCount) {
      await loadMoreReviews();
      await new Promise((resolve) => setTimeout(resolve, 3500)); // Wait for 2 seconds to allow content to load
      loadedReviewsCount = await page.$$eval(
        "[data-review-id]",
        (reviews) => reviews.length
      );
      console.log(
        `Loaded Reviews: ${loadedReviewsCount} of ${totalReviewsCount}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
    // Extract detailed review information
    const reviewsData = await page.$$eval(
      "[class*='jftiEf'][data-review-id]",
      (reviews) =>
        reviews.map((review) => {
          const reviewerProfileLink =
            review
              .querySelector("button[class*='WEBjve']")
              ?.getAttribute("data-href") || "";

          const reviewerAvatar =
            review
              .querySelector("button[class*='WEBjve'] > img.NBa7we")
              ?.getAttribute("src") || "";

          const reviewerName =
            review.querySelector(".GHT2ce button.al6Kxe > div")?.textContent ||
            "";

          const reviewerActivityStat =
            review
              .querySelector(".GHT2ce button.al6Kxe > div + div")
              ?.textContent?.split(" · ") || "";

          const reviewerBussinessRating =
            review
              .querySelector("span[class*='kvMYJc'][role][aria-label]")
              ?.getAttribute("aria-label")
              ?.split(",")[0] || "";

          // const imageUrls = Array.from(imageElements).map((el) => {
          //   const style = el.getAttribute("style");
          //   const urlMatch = style.match(/url\("(.+?)"\)/);
          //   return urlMatch ? urlMatch[1] : "";
          // });

          return {
            reviewerAvatar,
            reviewerProfileLink,
            reviewerName,
            reviewerActivityStat,
            reviewerBussinessRating,
          };
        })
    );
    console.log(
      "Extracted Reviews Data:",
      JSON.stringify(reviewsData, null, 2)
    );
  } catch (e) {
    console.error(`An error occurred: ${e}`);
  } finally {
    // if (browser) await browser.close();
  }
})();
