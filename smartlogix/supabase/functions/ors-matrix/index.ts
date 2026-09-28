import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationPayload {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface RequestBody {
  locations: LocationPayload[];
  profile?: string; // default: 'driving-car'
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { locations, profile = 'driving-car' }: RequestBody = await req.json();

    if (!locations || !Array.isArray(locations) || locations.length < 2) {
      return new Response(
        JSON.stringify({ 
          error: 'At least 2 valid locations with coordinates are required to build a distance matrix.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinates
    for (const loc of locations) {
      if (
        loc.latitude == null || 
        loc.longitude == null || 
        isNaN(loc.latitude) || 
        isNaN(loc.longitude) ||
        loc.latitude < -90 || loc.latitude > 90 ||
        loc.longitude < -180 || loc.longitude > 180
      ) {
        return new Response(
          JSON.stringify({ 
            error: `Location "${loc.name || loc.id}" has invalid or missing geographic coordinates.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const apiKey = Deno.env.get('ORS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'OpenRouteService API key (ORS_API_KEY) is not configured in Supabase Edge Function secrets. Please configure ORS_API_KEY in your Supabase dashboard.',
          code: 'MISSING_API_KEY'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ORS expects [longitude, latitude]
    const coordinates = locations.map(l => [Number(l.longitude), Number(l.latitude)]);

    const orsUrl = `https://api.openrouteservice.org/v2/matrix/${profile}`;
    const orsResponse = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locations: coordinates,
        metrics: ['distance', 'duration'],
        units: 'm'
      })
    });

    if (!orsResponse.ok) {
      const errText = await orsResponse.text();
      let errMsg = `OpenRouteService error (${orsResponse.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) {
          errMsg = parsed.error.message;
        } else if (parsed.message) {
          errMsg = parsed.message;
        }
      } catch {
        errMsg = errText || errMsg;
      }

      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: orsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await orsResponse.json();
    const distancesMeters: (number | null)[][] = data.distances || [];
    const durationsSeconds: (number | null)[][] = data.durations || [];

    // Check for unreachable pairs (null values)
    const unreachablePairs: { origin: string; destination: string }[] = [];
    const n = locations.length;
    const matrixKm: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrixKm[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrixKm[i][j] = 0;
        } else {
          const meters = distancesMeters[i]?.[j];
          if (meters === null || meters === undefined) {
            unreachablePairs.push({
              origin: locations[i].name,
              destination: locations[j].name
            });
            matrixKm[i][j] = NaN;
          } else {
            // Convert meters to kilometers rounded to 2 decimals
            matrixKm[i][j] = parseFloat((meters / 1000).toFixed(2));
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: 'ORS_ROAD',
        profile,
        units: 'meters',
        generated_at: new Date().toISOString(),
        distances_meters: distancesMeters,
        durations_seconds: durationsSeconds,
        matrix_km: matrixKm,
        unreachable_pairs: unreachablePairs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
