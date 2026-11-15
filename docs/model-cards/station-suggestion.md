# Model card: station representativeness suggestion

**What it does.** For a declared site, ranks the three nearest NEA heat-stress stations by distance and by how closely each station's observed hourly WBGT follows the local ERA5 rebuild for the site's grid cell. Suggests one station with a plain reason.

**What it never does.** It never applies a correction factor to readings (NEA researcher's guidance). A person approves the station before it is printed on the schedule. Changes apply from next month.

**Limits.** ERA5 is a 0.25 degree grid, so "local" is coarse. New stations with little history cannot be scored and are shown as such.
