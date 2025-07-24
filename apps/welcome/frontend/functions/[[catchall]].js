export async function onRequest(context) {
  // This function catches all routes and serves index.html
  // allowing React Router to handle client-side routing
  
  try {
    // Get the index.html from the assets
    const asset = await context.env.ASSETS.fetch(new URL('/index.html', context.request.url));
    
    // Return it with proper headers
    return new Response(asset.body, {
      status: 200,
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  } catch (e) {
    return new Response('Not found', { status: 404 });
  }
}