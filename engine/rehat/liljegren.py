"""Outdoor WBGT from standard meteorological inputs: the Liljegren et al. (2008) method, vectorised in numpy.

Reference: Liljegren, J. C., Carhart, R. A., Lawday, P., Tschopp, S., Sharp, R. (2008). Modeling the wet bulb globe
temperature using standard meteorological measurements. J. Occup. Environ. Hyg. 5(10), 645-655.
Constants and equations follow Argonne's public C code (wbgt.c, v1.1). The maintained package `pywbgt` 3.0.7 wraps the
same C code but segfaults in its solar routine on this machine (macOS arm64, numpy 2.2 and 2.5), so it is re-implemented
here. Checked against published behaviour: WBGT rises with sun and humidity, falls with wind.

WBGT = 0.7 Tnwb + 0.2 Tg + 0.1 Ta.
"""
from __future__ import annotations

import numpy as np

# physical constants (wbgt.c)
SOLAR_CONST = 1367.0
STEFANB = 5.6696e-8
CP = 1003.5
M_AIR = 28.97
M_H2O = 18.015
RATIO = CP * M_AIR / M_H2O
R_GAS = 8314.34
R_AIR = R_GAS / M_AIR
PR = CP / (CP + 1.25 * R_AIR)
# wick and globe
EMIS_WICK, ALB_WICK, D_WICK, L_WICK = 0.95, 0.4, 0.007, 0.0254
EMIS_GLOBE, ALB_GLOBE, D_GLOBE = 0.95, 0.05, 0.0508
# surface
EMIS_SFC, ALB_SFC = 0.999, 0.45
CZA_MIN = 0.00873
NORMSOLAR_MAX = 0.85
MIN_SPEED = 0.13


def esat(tk: np.ndarray) -> np.ndarray:
    """Saturation vapour pressure over water (hPa), Buck (1981) with enhancement factor."""
    y = (tk - 273.15) / (tk - 32.18)
    return 1.004 * 6.1121 * np.exp(17.502 * y)


def dew_point_k(e_hpa: np.ndarray) -> np.ndarray:
    z = np.log(e_hpa / (6.1121 * 1.004))
    return 273.15 + 240.97 * z / (17.502 - z)


def viscosity(tk: np.ndarray) -> np.ndarray:
    sigma, eps_kappa = 3.617, 97.0
    tr = tk / eps_kappa
    omega = (tr - 2.9) / 0.4 * (-0.034) + 1.048
    return 2.6693e-6 * np.sqrt(M_AIR * tk) / (sigma * sigma * omega)


def thermal_cond(tk: np.ndarray) -> np.ndarray:
    return (CP + 1.25 * R_AIR) * viscosity(tk)


def diffusivity(tk: np.ndarray, p_hpa: np.ndarray) -> np.ndarray:
    pcrit13 = (36.4 * 218.0) ** (1.0 / 3.0)
    tcrit512 = (132.0 * 647.3) ** (5.0 / 12.0)
    tcrit12 = np.sqrt(132.0 * 647.3)
    mmix = np.sqrt(1.0 / M_AIR + 1.0 / M_H2O)
    return 3.640e-4 * (tk / tcrit12) ** 2.334 * pcrit13 * tcrit512 * mmix / (p_hpa / 1013.25) * 1e-4


def evap(tk: np.ndarray) -> np.ndarray:
    return (313.15 - tk) / 30.0 * (-71100.0) + 2.4073e6


def emis_atm(tk: np.ndarray, rh: np.ndarray) -> np.ndarray:
    return 0.575 * (rh * esat(tk)) ** 0.143


def h_sphere(diameter: float, tk: np.ndarray, p_hpa: np.ndarray, speed: np.ndarray) -> np.ndarray:
    density = p_hpa * 100.0 / (R_AIR * tk)
    re = np.maximum(speed, MIN_SPEED) * density * diameter / viscosity(tk)
    nu = 2.0 + 0.6 * np.sqrt(re) * PR**0.3333
    return nu * thermal_cond(tk) / diameter


def h_cylinder(diameter: float, tk: np.ndarray, p_hpa: np.ndarray, speed: np.ndarray) -> np.ndarray:
    density = p_hpa * 100.0 / (R_AIR * tk)
    re = np.maximum(speed, MIN_SPEED) * density * diameter / viscosity(tk)
    nu = 0.281 * re ** (1.0 - 0.4) * PR ** (1.0 - 0.56)
    return nu * thermal_cond(tk) / diameter


def cos_zenith(utc: np.ndarray, lat: float, lon: float) -> np.ndarray:
    """Cosine of the solar zenith angle (NOAA general solar position equations). `utc` is datetime64."""
    t = utc.astype("datetime64[s]").astype("int64")
    doy = ((utc.astype("datetime64[D]") - utc.astype("datetime64[Y]")).astype(int) + 1).astype(float)
    hour = (t % 86400) / 3600.0
    g = 2 * np.pi / 365.0 * (doy - 1 + (hour - 12) / 24)
    eqtime = 229.18 * (0.000075 + 0.001868 * np.cos(g) - 0.032077 * np.sin(g) - 0.014615 * np.cos(2 * g) - 0.040849 * np.sin(2 * g))
    decl = 0.006918 - 0.399912 * np.cos(g) + 0.070257 * np.sin(g) - 0.006758 * np.cos(2 * g) + 0.000907 * np.sin(2 * g) - 0.002697 * np.cos(3 * g) + 0.00148 * np.sin(3 * g)
    tst = hour * 60 + eqtime + 4 * lon
    ha = np.radians(tst / 4 - 180)
    la = np.radians(lat)
    return np.sin(la) * np.sin(decl) + np.cos(la) * np.cos(decl) * np.cos(ha)


def earth_sun_factor(utc: np.ndarray) -> np.ndarray:
    doy = ((utc.astype("datetime64[D]") - utc.astype("datetime64[Y]")).astype(int) + 1).astype(float)
    return 1.0 + 0.033 * np.cos(2 * np.pi * doy / 365.0)


def wbgt(
    utc: np.ndarray,
    lat: float,
    lon: float,
    temp_c: np.ndarray,
    rh_pct: np.ndarray,
    pres_hpa: np.ndarray,
    speed_2m: np.ndarray,
    solar: np.ndarray,
    fdir: np.ndarray | None = None,
    iters: int = 200,
) -> dict[str, np.ndarray]:
    """Return dict with Tg, Tnwb, Twbg in deg C.

    utc: mid-point of the averaging interval (datetime64). solar: global horizontal irradiance W/m2.
    fdir: direct-beam fraction; if None, Liljegren's estimate from normalised solar is used.
    """
    ta = np.asarray(temp_c, float) + 273.15
    rh = np.clip(np.asarray(rh_pct, float) / 100.0, 0.01, 1.0)
    p = np.asarray(pres_hpa, float)
    u = np.maximum(np.asarray(speed_2m, float), MIN_SPEED)
    s = np.clip(np.asarray(solar, float), 0, None)
    cza = cos_zenith(utc, lat, lon)
    day = cza > CZA_MIN
    toa = SOLAR_CONST * np.clip(cza, CZA_MIN, None) * earth_sun_factor(utc)
    norm = np.where(day, np.clip(s / toa, 0, NORMSOLAR_MAX), 0.0)
    s = np.where(day, np.minimum(s, norm * toa if fdir is None else s), 0.0)
    if fdir is None:
        with np.errstate(divide="ignore", over="ignore"):
            fd = np.exp(3.0 - 1.34 * norm - 1.65 / np.where(norm > 0, norm, 1e-6))
        fdir_ = np.where(day, np.clip(fd, 0.0, 0.9), 0.0)
    else:
        fdir_ = np.where(day, np.clip(np.asarray(fdir, float), 0.0, 0.9), 0.0)
    cza_c = np.where(day, np.clip(cza, CZA_MIN, 1.0), 1.0)
    tsfc = ta
    e_atm = emis_atm(ta, rh)

    # globe temperature
    tg = ta.copy()
    for _ in range(iters):
        tref = 0.5 * (tg + ta)
        h = h_sphere(D_GLOBE, tref, p, u)
        new = (
            0.5 * (e_atm * ta**4 + EMIS_SFC * tsfc**4)
            - h / (STEFANB * EMIS_GLOBE) * (tg - ta)
            + s / (2.0 * STEFANB * EMIS_GLOBE) * (1.0 - ALB_GLOBE) * (fdir_ * (1.0 / (2.0 * cza_c) - 1.0) + 1.0 + ALB_SFC)
        )
        new = np.clip(new, 1e8, None) ** 0.25
        if np.nanmax(np.abs(new - tg)) < 0.02:
            tg = new
            break
        tg = 0.9 * tg + 0.1 * new

    # natural wet bulb
    eair = rh * esat(ta)
    twb = dew_point_k(eair)
    sza = np.arccos(cza_c)
    for _ in range(iters):
        tref = 0.5 * (twb + ta)
        h = h_cylinder(D_WICK, tref, p, u)
        fatm = STEFANB * EMIS_WICK * (0.5 * (e_atm * ta**4 + EMIS_SFC * tsfc**4) - twb**4) + (1.0 - ALB_WICK) * s * (
            (1.0 - fdir_) * (1.0 + 0.25 * D_WICK / L_WICK) + fdir_ * ((np.tan(sza) / np.pi) + 0.25 * D_WICK / L_WICK) + ALB_SFC
        )
        ewick = esat(twb)
        density = p * 100.0 / (R_AIR * tref)
        sc = viscosity(tref) / (density * diffusivity(tref, p))
        new = ta - evap(tref) / RATIO * (ewick - eair) / (p - ewick) * (PR / sc) ** 0.56 + fatm / h
        if np.nanmax(np.abs(new - twb)) < 0.02:
            twb = new
            break
        twb = 0.9 * twb + 0.1 * new

    tg_c, tnwb_c, ta_c = tg - 273.15, twb - 273.15, ta - 273.15
    return {"Tg": tg_c, "Tnwb": tnwb_c, "Twbg": 0.7 * tnwb_c + 0.2 * tg_c + 0.1 * ta_c}


def wind_10m_to_2m(u10: np.ndarray, daytime: np.ndarray) -> np.ndarray:
    """Power-law height adjustment, urban exponents (Liljegren est_wind_speed): unstable day 0.15, night 0.30."""
    p = np.where(daytime, 0.15, 0.30)
    return np.asarray(u10, float) * (2.0 / 10.0) ** p
