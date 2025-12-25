import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return new NextResponse('Path parameter is required', { status: 400 });
  }

  const urlToVisit = new URL(path, process.env.NEXT_PUBLIC_BASE_URL).toString();

  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });

    await page.goto(urlToVisit, { waitUntil: 'networkidle2' });

    // 確実に「投票」ボタンの親コンテナを非表示にする
    // 方法：クラスに一部でも含まれるもの（mt-10）を使い、かつ深い子孫も検索（querySelectorAll + some）
    await page.evaluate(() => {
      // 投票タブ時にのみ存在する「投票」ボタンの親 div を探す
      // classに "mt-10" を含む && 子に button があり、そのテキストが「投票」または「送信中...」
      const containers = document.querySelectorAll('#tier-list-container div');
      for (const container of containers) {
        if (container.classList.contains('mt-10') && container.classList.toString().includes('justify-center')) {
          const button = container.querySelector('button');
          if (button && (button.textContent?.includes('投票') || button.textContent?.includes('送信中'))) {
            // 元の display を保存
            (container as HTMLElement).dataset.originalDisplay = 
              (container as HTMLElement).style.display || 'flex';
            (container as HTMLElement).style.display = 'none';
            break; // 見つかったら終了
          }
        }
      }
    });

    const element = await page.$('#tier-list-container');

    if (!element) {
      throw new Error('Screenshot target element #tier-list-container not found');
    }

    const imageBuffer = await element.screenshot({ type: 'png' });

    // 非表示にした要素を元に戻す
    await page.evaluate(() => {
      const containers = document.querySelectorAll('#tier-list-container div');
      for (const container of containers) {
        if (container.classList.contains('mt-10') && container.classList.toString().includes('justify-center')) {
          const button = container.querySelector('button');
          if (button && (button.textContent?.includes('投票') || button.textContent?.includes('送信中'))) {
            const original = (container as HTMLElement).dataset.originalDisplay;
            if (original) {
              (container as HTMLElement).style.display = original;
              delete (container as HTMLElement).dataset.originalDisplay;
            } else {
              (container as HTMLElement).style.display = '';
            }
            break;
          }
        }
      }
    });

    await browser.close();

    return new NextResponse(imageBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Screenshot failed:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }
    return new NextResponse('Failed to generate screenshot', { status: 500 });
  }
}