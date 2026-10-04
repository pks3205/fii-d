package com.goldos.app.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.isSystemInDarkTheme
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.goldos.app.R
import com.goldos.app.data.GoldCandle
import com.goldos.app.data.GoldSnapshot
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.Year
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

private val GoldAccent = Color(0xFFC3A166)
private val GoldPale = Color(0xFFDFC18A)
private val QuietGreen = Color(0xFF93AB96)
private val QuietRed = Color(0xFFB77D70)
private val DefaultTasks = listOf("Set the day’s intention", "Review gold journal", "Backtest one setup", "Take a mindful break")
private val DefaultPlan = listOf(
    PlanItem("08:45", "Morning focus", "focus"), PlanItem("10:00", "Deep work", "focus"),
    PlanItem("11:45", "Inbox reset", "personal"), PlanItem("13:30", "Personal hour", "personal"),
    PlanItem("15:00", "Gold review", "gold"), PlanItem("16:00", "Research", "focus"),
    PlanItem("18:00", "Walk / gym", "personal"),
)
private data class PlanItem(val time: String, val title: String, val kind: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoldOsDashboard(viewModel: DashboardViewModel) {
    val state by viewModel.state.collectAsState()
    var showSettings by rememberSaveable { mutableStateOf(false) }
    var appearance by rememberSaveable { mutableStateOf("System") }
    var timeZone by rememberSaveable { mutableStateOf("Asia/Kolkata") }
    var clockFormat by rememberSaveable { mutableStateOf("24h") }
    var clockFont by rememberSaveable { mutableStateOf("Editorial") }
    var clockSize by rememberSaveable { mutableFloatStateOf(82f) }
    var clockOpacity by rememberSaveable { mutableFloatStateOf(.92f) }
    var clockPosition by rememberSaveable { mutableStateOf("Upper") }
    var brightness by rememberSaveable { mutableFloatStateOf(.76f) }
    var backgroundStrength by rememberSaveable { mutableFloatStateOf(.8f) }
    var goldStrength by rememberSaveable { mutableFloatStateOf(.55f) }
    var chartOpacity by rememberSaveable { mutableFloatStateOf(.88f) }
    var showGold by rememberSaveable { mutableStateOf(true) }
    var showPrice by rememberSaveable { mutableStateOf(true) }
    var showChange by rememberSaveable { mutableStateOf(true) }
    var showHighLow by rememberSaveable { mutableStateOf(true) }
    var showChart by rememberSaveable { mutableStateOf(true) }
    var showTrend by rememberSaveable { mutableStateOf(true) }
    var showRsi by rememberSaveable { mutableStateOf(true) }
    var showVwap by rememberSaveable { mutableStateOf(true) }
    var showVolatility by rememberSaveable { mutableStateOf(true) }
    var showCalendar by rememberSaveable { mutableStateOf(true) }
    var showSchedule by rememberSaveable { mutableStateOf(true) }
    var showYear by rememberSaveable { mutableStateOf(true) }
    var showTasks by rememberSaveable { mutableStateOf(true) }
    var showSessions by rememberSaveable { mutableStateOf(true) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var tasks by remember { mutableStateOf(DefaultTasks.map { it to false }) }
    var taskDialog by rememberSaveable { mutableStateOf(false) }
    var taskDraft by rememberSaveable { mutableStateOf("") }
    val darkTheme = when (appearance) { "Light" -> false; "Dark" -> true; else -> isSystemInDarkTheme() }
    val zone = remember(timeZone) { runCatching { ZoneId.of(timeZone) }.getOrDefault(ZoneId.of("Asia/Kolkata")) }
    val instant = remember(now) { Instant.ofEpochMilli(now) }
    val localDate = remember(instant, zone) { instant.atZone(zone).toLocalDate() }
    val localTime = remember(instant, zone) { instant.atZone(zone).toLocalTime() }

    LaunchedEffect(Unit) {
        while (true) { now = System.currentTimeMillis(); delay(1000) }
    }

    GoldOsTheme(darkTheme = darkTheme) {
        Box(Modifier.fillMaxSize().background(Color(0xFF100E0C))) {
            Image(
                painter = painterResource(R.drawable.gold_os_wallpaper),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                alpha = backgroundStrength,
            )
            Box(Modifier.fillMaxSize().background(if (darkTheme) Color(0x9E090806) else Color(0x5AF1E4CC)))
            val brightnessOverlay = if (brightness < .76f) {
                Color.Black.copy(alpha = ((.76f - brightness) * 1.2f).coerceIn(0f, .5f))
            } else {
                Color.White.copy(alpha = ((brightness - .76f) * .65f).coerceIn(0f, .25f))
            }
            Box(Modifier.fillMaxSize().background(brightnessOverlay))
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 9.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SystemTopLine(localTime, timeZone, showSessions, showSessionsLabel = showSessionsLabel(now, zone))
                ClockHero(localDate, localTime, timeZone, clockFormat, clockFont, clockSize, clockOpacity, clockPosition, darkTheme)
                if (showCalendar || showSchedule) {
                    PlannerSection(localDate, localTime, zone, showCalendar, showSchedule)
                }
                if (showGold) {
                    GoldTerminal(
                        snapshot = state.snapshot,
                        timeframe = state.timeframe,
                        dataMode = state.dataMode,
                        isRefreshing = state.isRefreshing,
                        showPrice = showPrice,
                        showChange = showChange,
                        showHighLow = showHighLow,
                        showChart = showChart,
                        showTrend = showTrend,
                        showRsi = showRsi,
                        showVwap = showVwap,
                        showVolatility = showVolatility,
                        chartOpacity = chartOpacity,
                        goldStrength = goldStrength,
                        timeZone = timeZone,
                        onTimeframe = viewModel::setTimeframe,
                        onRefresh = viewModel::refreshNow,
                    )
                }
                if (showYear) YearProgress(localDate)
                if (showTasks) {
                    TaskGlassPanel(
                        tasks = tasks,
                        onToggle = { index -> tasks = tasks.mapIndexed { i, item -> if (i == index) item.first to !item.second else item } },
                        onDelete = { index -> tasks = tasks.filterIndexed { i, _ -> i != index } },
                        onAdd = { taskDraft = ""; taskDialog = true },
                    )
                }
                Text(
                    "${if (showSessions) "SESSION · ${showSessionsLabel(now, zone)} · $timeZone" else "GOLD OS"}     INFORMATIONAL ONLY · NOT A TRADE SIGNAL",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = .5f),
                    fontSize = 7.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp, bottom = 22.dp),
                    textAlign = TextAlign.Center,
                )
            }
            IconButton(onClick = { showSettings = true }, modifier = Modifier.align(Alignment.TopEnd).padding(top = 32.dp, end = 14.dp).size(34.dp)) {
                Icon(Icons.Rounded.Settings, contentDescription = "Theme settings", tint = GoldPale, modifier = Modifier.size(18.dp))
            }
        }

        if (showSettings) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            val scope = rememberCoroutineScope()
            ModalBottomSheet(onDismissRequest = { showSettings = false }, sheetState = sheetState, containerColor = Color(0xFF191613), contentColor = Color(0xFFF2EADB)) {
                SettingsContent(
                    appearance = appearance, onAppearance = { appearance = it },
                    timeZone = timeZone, onTimeZone = { timeZone = it },
                    clockFormat = clockFormat, onClockFormat = { clockFormat = it },
                    clockFont = clockFont, onClockFont = { clockFont = it },
                    clockSize = clockSize, onClockSize = { clockSize = it },
                    clockOpacity = clockOpacity, onClockOpacity = { clockOpacity = it },
                    clockPosition = clockPosition, onClockPosition = { clockPosition = it },
                    brightness = brightness, onBrightness = { brightness = it },
                    backgroundStrength = backgroundStrength, onBackgroundStrength = { backgroundStrength = it },
                    goldStrength = goldStrength, onGoldStrength = { goldStrength = it },
                    chartOpacity = chartOpacity, onChartOpacity = { chartOpacity = it },
                    dataMode = state.dataMode, onDataMode = viewModel::setDataMode,
                    batteryMode = state.batteryMode, onBatteryMode = viewModel::setBatteryMode,
                    timeframe = state.timeframe, onTimeframe = viewModel::setTimeframe,
                    showGold = showGold, onShowGold = { showGold = it },
                    showPrice = showPrice, onShowPrice = { showPrice = it },
                    showChange = showChange, onShowChange = { showChange = it },
                    showHighLow = showHighLow, onShowHighLow = { showHighLow = it },
                    showChart = showChart, onShowChart = { showChart = it },
                    showTrend = showTrend, onShowTrend = { showTrend = it },
                    showRsi = showRsi, onShowRsi = { showRsi = it },
                    showVwap = showVwap, onShowVwap = { showVwap = it },
                    showVolatility = showVolatility, onShowVolatility = { showVolatility = it },
                    showCalendar = showCalendar, onShowCalendar = { showCalendar = it },
                    showSchedule = showSchedule, onShowSchedule = { showSchedule = it },
                    showYear = showYear, onShowYear = { showYear = it },
                    showTasks = showTasks, onShowTasks = { showTasks = it },
                    showSessions = showSessions, onShowSessions = { showSessions = it },
                    onClose = { scope.launch { sheetState.hide(); showSettings = false } },
                )
            }
        }

        if (taskDialog) {
            AlertDialog(
                onDismissRequest = { taskDialog = false },
                title = { Text("A small next step", fontFamily = FontFamily.Serif) },
                text = { OutlinedTextField(value = taskDraft, onValueChange = { taskDraft = it.take(44) }, label = { Text("Task") }, singleLine = true) },
                confirmButton = { TextButton(onClick = { if (taskDraft.isNotBlank()) tasks = tasks + (taskDraft.trim() to false); taskDialog = false }) { Text("ADD", color = GoldAccent) } },
                dismissButton = { TextButton(onClick = { taskDialog = false }) { Text("CANCEL") } },
            )
        }
    }
}

@Composable
private fun SystemTopLine(time: LocalTime, timeZone: String, showSessions: Boolean, showSessionsLabel: String) {
    Row(Modifier.fillMaxWidth().height(24.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(time.format(DateTimeFormatter.ofPattern("HH:mm")), color = Color(0xFFD7CBB8), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
        Spacer(Modifier.weight(1f))
        Text(if (showSessions) showSessionsLabel.uppercase(Locale.ROOT) else "GOLD ONLY", color = GoldPale, fontSize = 7.sp, fontFamily = FontFamily.Monospace, maxLines = 1)
        Spacer(Modifier.width(8.dp))
        Text(timeZone.substringAfterLast('/').replace('_', ' ').uppercase(Locale.ROOT), color = Color(0xFFA09687), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
    }
}

@Composable
private fun ClockHero(date: LocalDate, time: LocalTime, timeZone: String, clockFormat: String, clockFont: String, clockSize: Float, clockOpacity: Float, clockPosition: String, darkTheme: Boolean) {
    val formatter = if (clockFormat == "12h") DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH) else DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH)
    val color = if (darkTheme) Color(0xFFF2EADB) else Color(0xFF382D20)
    val topPadding = when (clockPosition) { "Upper" -> 6.dp; "Lower" -> 28.dp; else -> 17.dp }
    Column(Modifier.fillMaxWidth().padding(top = topPadding, bottom = 4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("✦  ${timeZone.replace("/", " / ").replace('_', ' ').uppercase(Locale.ROOT)}     ·     ${greeting(time.hour)}", color = Color(0xFFB6A78F).copy(alpha = clockOpacity), fontSize = 7.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp)
        Text(
            time.format(formatter),
            color = color.copy(alpha = clockOpacity),
            fontSize = clockSize.sp,
            fontFamily = when (clockFont) { "Modern" -> FontFamily.SansSerif; "Mono" -> FontFamily.Monospace; else -> FontFamily.Serif },
            fontWeight = FontWeight.Light,
            letterSpacing = (-4).sp,
            modifier = Modifier.padding(top = 0.dp),
        )
        Text("${date.dayOfWeek.name.take(3)}  •  ${date.dayOfMonth.toString().padStart(2, '0')} ${date.month.name}", color = color.copy(alpha = .86f * clockOpacity), fontSize = 9.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)
        Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
            Box(Modifier.width(23.dp).height(1.dp).background(GoldAccent.copy(alpha = .38f)))
            Text("  MAKE THE NEXT MOVE COUNT  ", color = Color(0xFF9A8D78), fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.5.sp)
            Box(Modifier.width(23.dp).height(1.dp).background(GoldAccent.copy(alpha = .38f)))
        }
    }
}

@Composable
private fun PlannerSection(date: LocalDate, time: LocalTime, zone: ZoneId, showCalendar: Boolean, showSchedule: Boolean) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val stack = maxWidth < 360.dp
        if (stack) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showCalendar) CalendarGlass(date)
                if (showSchedule) ScheduleGlass(time, zone)
            }
        } else {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (showCalendar) Box(Modifier.weight(if (showSchedule) 1.05f else 1f)) { CalendarGlass(date) }
                if (showSchedule) Box(Modifier.weight(if (showCalendar) .95f else 1f)) { ScheduleGlass(time, zone) }
            }
        }
    }
}

@Composable
private fun CalendarGlass(today: LocalDate) {
    val month = YearMonth.from(today)
    val first = month.atDay(1)
    val mondayOffset = (first.dayOfWeek.value - 1) % 7
    val daysInMonth = month.lengthOfMonth()
    GlassPanel(modifier = Modifier.fillMaxWidth().height(222.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Eyebrow("THE MONTH")
                Text("${month.month.name}  ${month.year}", color = Color(0xFFE8D8BD), fontSize = 9.sp, fontFamily = FontFamily.Monospace, letterSpacing = .5.sp)
            }
            Text("‹   ›", color = GoldPale.copy(alpha = .75f), fontSize = 11.sp)
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            listOf("M", "T", "W", "T", "F", "S", "S").forEach { Text(it, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, color = Color(0xFF827764), fontSize = 7.sp, fontFamily = FontFamily.Monospace) }
        }
        Spacer(Modifier.height(4.dp))
        repeat(6) { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                repeat(7) { weekday ->
                    val index = week * 7 + weekday
                    val day = index - mondayOffset + 1
                    val inMonth = day in 1..daysInMonth
                    val shown = when { day < 1 -> month.minusMonths(1).lengthOfMonth() + day; day > daysInMonth -> day - daysInMonth; else -> day }
                    val isToday = inMonth && day == today.dayOfMonth
                    Box(Modifier.weight(1f).height(25.dp), contentAlignment = Alignment.Center) {
                        Box(
                            Modifier.size(22.dp)
                                .clip(CircleShape)
                                .background(if (isToday) GoldAccent.copy(alpha = .42f) else Color.Transparent)
                                .then(if (isToday) Modifier.border(1.dp, GoldPale.copy(alpha = .75f), CircleShape) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(shown.toString(), color = if (isToday) Color(0xFFF4E3C4) else if (inMonth) Color(0xFFD7CBB8) else Color(0xFF827764).copy(alpha = .48f), fontSize = 7.sp, fontFamily = FontFamily.Monospace)
                        }
                        if (isToday) Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 1.dp).size(2.dp).background(GoldPale, CircleShape))
                    }
                }
            }
        }
        Spacer(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(4.dp).background(GoldAccent, CircleShape))
            Text("  ROUTINE DAY", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp)
        }
    }
}

@Composable
private fun ScheduleGlass(time: LocalTime, zone: ZoneId) {
    val minuteNow = time.hour * 60 + time.minute
    val events = DefaultPlan
    val nextIndex = events.indexOfFirst { item -> item.time.substring(0, 2).toInt() * 60 + item.time.substring(3, 5).toInt() >= minuteNow }
    GlassPanel(modifier = Modifier.fillMaxWidth().height(222.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Eyebrow("A GENTLE PLAN"); Text("Today", color = Color(0xFFF0E3CF), fontSize = 15.sp, fontFamily = FontFamily.Serif) }
            Text("LOCAL", color = Color(0xFF988A75), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
        }
        Spacer(Modifier.height(5.dp))
        events.forEachIndexed { index, item ->
            val eventMinute = item.time.substring(0, 2).toInt() * 60 + item.time.substring(3, 5).toInt()
            val past = eventMinute < minuteNow
            Row(Modifier.fillMaxWidth().height(22.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(item.time, modifier = Modifier.width(35.dp), color = if (past) Color(0xFF807667).copy(alpha = .55f) else Color(0xFFA09687), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
                Box(Modifier.size(4.dp).background(if (item.kind == "gold") GoldPale else if (item.kind == "personal") Color(0xFF9A8D9D) else Color(0xFF93A39B), CircleShape))
                Text(item.title, modifier = Modifier.weight(1f).padding(start = 6.dp), color = if (past) Color(0xFF807667).copy(alpha = .55f) else if (index == nextIndex) GoldPale else Color(0xFFD7CBB8), fontSize = 7.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Spacer(Modifier.weight(1f))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("●  SAMPLE PLAN", color = Color(0xFF827764), fontSize = 5.sp, fontFamily = FontFamily.Monospace, letterSpacing = .5.sp)
            Text(if (nextIndex >= 0) "NEXT · ${events[nextIndex].time}" else "ALL SET", color = GoldPale.copy(alpha = .7f), fontSize = 5.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
private fun GoldTerminal(
    snapshot: GoldSnapshot?, timeframe: String, dataMode: String, isRefreshing: Boolean,
    showPrice: Boolean, showChange: Boolean, showHighLow: Boolean, showChart: Boolean,
    showTrend: Boolean, showRsi: Boolean, showVwap: Boolean, showVolatility: Boolean,
    chartOpacity: Float, goldStrength: Float, timeZone: String,
    onTimeframe: (String) -> Unit, onRefresh: () -> Unit,
) {
    val status = snapshot?.dataStatus ?: if (dataMode == "demo") "DEMO DATA" else "UNAVAILABLE"
    GlassPanel(modifier = Modifier.fillMaxWidth(), goldBorder = true, goldStrength = goldStrength) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(28.dp).border(1.dp, GoldAccent.copy(alpha = .75f * goldStrength), CircleShape), contentAlignment = Alignment.Center) {
                Text("Au", color = GoldPale, fontFamily = FontFamily.Serif, fontSize = 13.sp, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
            }
            Column(Modifier.padding(start = 8.dp).weight(1f)) {
                Eyebrow("GOLD / US DOLLAR")
                Text("XAUUSD", color = Color(0xFFF0E6D5), fontSize = 10.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp)
            }
            StatusBadge(status)
            IconButton(onClick = onRefresh, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Refresh gold data", tint = if (isRefreshing) GoldPale else Color(0xFFA09687), modifier = Modifier.size(15.dp))
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 13.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.SpaceBetween) {
            if (showPrice) {
                Text(snapshot?.price?.let { "$" + String.format(Locale.US, "%,.2f", it) } ?: "N/A", color = Color(0xFFF0E6D5), fontSize = 31.sp, fontFamily = FontFamily.Serif, letterSpacing = (-1.5).sp, maxLines = 1)
            }
            if (showChange) {
                Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(bottom = 2.dp)) {
                    val change = snapshot?.changePercent
                    Text(change?.let { String.format(Locale.US, "%+.2f%%", it) } ?: "N/A", color = changeColor(change), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                    Text("DAY", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp)
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(when { snapshot?.marketStatus == "closed" -> "Market closed · last quote"; status == "DEMO DATA" -> "Simulated market · do not trade"; status == "LIVE" -> "XAUUSD · provider feed"; else -> "Provider data may be delayed" }, color = Color(0xFFA09687), fontSize = 6.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(snapshot?.let { ageText(it.quoteAgeSeconds, it.isDemo) } ?: "Waiting for feed", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
        }
        if (showChart) {
            Spacer(Modifier.height(7.dp))
            MiniCandles(snapshot?.candles.orEmpty(), modifier = Modifier.fillMaxWidth().height(105.dp), opacity = chartOpacity)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(snapshot?.candles?.firstOrNull()?.let { formatCandleTime(it.openTime, timeZone) } ?: "OHLC N/A", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
                Text(if (status == "DEMO DATA") "DEMO NOW" else snapshot?.candles?.lastOrNull()?.let { formatCandleTime(it.openTime, timeZone) } ?: "N/A", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
            }
            Row(Modifier.fillMaxWidth().padding(top = 5.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                listOf("1m", "5m", "15m", "1h").forEach { option ->
                    FilterChip(selected = timeframe == option, onClick = { onTimeframe(option) }, label = { Text(option.uppercase(), fontSize = 7.sp, fontFamily = FontFamily.Monospace) }, modifier = Modifier.height(29.dp))
                }
                Spacer(Modifier.weight(1f))
                Text("${snapshot?.candles?.size ?: 0} BARS", modifier = Modifier.align(Alignment.CenterVertically), color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = .5.sp)
            }
        }
        if (showHighLow) {
            Row(Modifier.fillMaxWidth().padding(top = 9.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column { Eyebrow("HIGH"); Text(snapshot?.high?.let { "$" + String.format(Locale.US, "%,.2f", it) } ?: "N/A", color = Color(0xFFD7CBB8), fontSize = 8.sp, fontFamily = FontFamily.Monospace) }
                Spacer(Modifier.weight(1f))
                Box(Modifier.weight(1.8f).height(2.dp).background(Color(0xFF877B67).copy(alpha = .55f), RoundedCornerShape(2.dp)))
                Spacer(Modifier.weight(1f))
                Column(horizontalAlignment = Alignment.End) { Eyebrow("LOW"); Text(snapshot?.low?.let { "$" + String.format(Locale.US, "%,.2f", it) } ?: "N/A", color = Color(0xFFD7CBB8), fontSize = 8.sp, fontFamily = FontFamily.Monospace) }
            }
        }
        val visibleIndicators = listOf(showTrend, showVwap, showRsi, showVolatility).count { it }
        if (visibleIndicators > 0) {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                if (showTrend) IndicatorCell("TREND", snapshot?.trend ?: "N/A", if (snapshot?.trend == "BULLISH") QuietGreen else if (snapshot?.trend == "BEARISH") QuietRed else Color(0xFFD7CBB8), Modifier.weight(1f))
                if (showVwap) IndicatorCell("VWAP", vwapRead(snapshot), Color(0xFFD7CBB8), Modifier.weight(1f))
                if (showRsi) IndicatorCell("RSI", snapshot?.rsi?.let { it.toInt().toString() } ?: "N/A", Color(0xFFD7CBB8), Modifier.weight(1f))
                if (showVolatility) IndicatorCell("VOLATILITY", snapshot?.volatility ?: "N/A", Color(0xFFD7CBB8), Modifier.weight(1f))
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth().padding(top = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("✳", color = GoldPale, fontSize = 9.sp)
            Text("  ${if (dataMode == "demo") "SIMULATED · NOT A LIVE PRICE" else "BIQUOTE · XAUUSD DATA"}", color = Color(0xFF827764), fontSize = 5.5.sp, fontFamily = FontFamily.Monospace, letterSpacing = .3.sp)
            Spacer(Modifier.weight(1f))
            Text("${snapshot?.candles?.size ?: 0} OHLC", color = Color(0xFF827764), fontSize = 5.5.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
private fun MiniCandles(candles: List<GoldCandle>, modifier: Modifier = Modifier, opacity: Float = .9f) {
    Canvas(modifier) {
        val bars = candles.takeLast(40)
        if (bars.size < 2) return@Canvas
        val maxPrice = bars.maxOf { it.high }
        val minPrice = bars.minOf { it.low }
        val padding = max((maxPrice - minPrice) * .12, maxPrice * .00012)
        val topPrice = maxPrice + padding
        val bottomPrice = minPrice - padding
        val priceRange = (topPrice - bottomPrice).coerceAtLeast(.001)
        val yFor = { price: Double -> size.height - ((price - bottomPrice) / priceRange).toFloat() * size.height }
        val gridColor = Color(0xFFD6C7AD).copy(alpha = .1f * opacity)
        listOf(.12f, .47f, .82f).forEach { fraction ->
            val y = size.height * fraction
            drawLine(gridColor, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
        }
        val step = size.width / bars.size
        val candleWidth = (step * .43f).coerceIn(2.dp.toPx(), 5.dp.toPx())
        bars.forEachIndexed { index, candle ->
            val x = step * index + step / 2f
            val rising = candle.close >= candle.open
            val latest = index == bars.lastIndex
            val color = when { latest -> GoldPale; rising -> QuietGreen; else -> QuietRed }
            drawLine(color.copy(alpha = .9f * opacity), Offset(x, yFor(candle.high)), Offset(x, yFor(candle.low)), strokeWidth = if (latest) 1.25.dp.toPx() else .8.dp.toPx(), cap = StrokeCap.Round)
            val openY = yFor(candle.open)
            val closeY = yFor(candle.close)
            val bodyTop = min(openY, closeY)
            val bodyHeight = max(1.5.dp.toPx(), kotlin.math.abs(closeY - openY))
            drawRect(
                color = if (!rising && !latest) color.copy(alpha = .22f * opacity) else color.copy(alpha = .84f * opacity),
                topLeft = Offset(x - candleWidth / 2f, bodyTop),
                size = Size(candleWidth, bodyHeight),
                style = if (!rising && !latest) Stroke(width = .75.dp.toPx()) else Stroke(width = if (latest) 1.dp.toPx() else .4.dp.toPx()),
            )
            if (latest) drawCircle(Color(0xFFF4E3C4), radius = 2.dp.toPx(), center = Offset(x, closeY))
        }
    }
}

@Composable
private fun YearProgress(date: LocalDate) {
    val days = Year.of(date.year).length()
    val day = date.dayOfYear
    val progress = day.toFloat() / days
    GlassPanel(Modifier.fillMaxWidth(), panelPadding = 12.dp) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) { Eyebrow("THE YEAR IN VIEW"); Text(date.year.toString(), color = Color(0xFFE6D8C0), fontSize = 14.sp, fontFamily = FontFamily.Serif) }
            Text("${(progress * 100).toInt()}%", color = GoldPale, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
        }
        BoxWithConstraints(Modifier.fillMaxWidth().padding(top = 7.dp).height(7.dp)) {
            Box(Modifier.fillMaxWidth().height(2.dp).align(Alignment.CenterStart).background(Color(0xFFD6C7AD).copy(alpha = .17f), RoundedCornerShape(3.dp)))
            Box(Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(2.dp).align(Alignment.CenterStart).background(GoldAccent, RoundedCornerShape(3.dp)))
            Box(Modifier.offset(x = (maxWidth * progress.coerceIn(0f, 1f) - 3.dp)).size(6.dp).align(Alignment.CenterStart).background(GoldPale, CircleShape))
        }
        Row(Modifier.fillMaxWidth().padding(top = 5.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("01 JAN", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
            Text("${days - day} DAYS LEFT", color = Color(0xFFA09687), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
            Text("31 DEC", color = Color(0xFF827764), fontSize = 6.sp, fontFamily = FontFamily.Monospace)
        }
    }
}

@Composable
private fun TaskGlassPanel(tasks: List<Pair<String, Boolean>>, onToggle: (Int) -> Unit, onDelete: (Int) -> Unit, onAdd: () -> Unit) {
    GlassPanel(Modifier.fillMaxWidth(), panelPadding = 13.dp) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Eyebrow("A CLEAR MIND, A CLEAR PLAN"); Text("Today  ·  tasks", color = Color(0xFFF0E3CF), fontSize = 17.sp, fontFamily = FontFamily.Serif) }
            Text("${tasks.count { it.second }} / ${tasks.size}", color = Color(0xFFA09687), fontSize = 7.sp, fontFamily = FontFamily.Monospace)
            IconButton(onClick = onAdd, modifier = Modifier.size(28.dp)) { Icon(Icons.Rounded.Add, contentDescription = "Add task", tint = GoldPale, modifier = Modifier.size(16.dp)) }
        }
        Spacer(Modifier.height(9.dp))
        if (tasks.isEmpty()) Text("Add one small thing to begin.", color = Color(0xFFA09687), fontSize = 8.sp)
        tasks.chunked(2).forEachIndexed { rowIndex, row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                row.forEachIndexed { columnIndex, task ->
                    val index = rowIndex * 2 + columnIndex
                    Row(Modifier.weight(1f).height(30.dp).clickable { onToggle(index) }, verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(14.dp).border(1.dp, if (task.second) GoldPale else Color(0xFF9E907B), RoundedCornerShape(4.dp)).background(if (task.second) GoldAccent.copy(alpha = .82f) else Color.Transparent, RoundedCornerShape(4.dp)), contentAlignment = Alignment.Center) {
                            if (task.second) Text("✓", color = Color(0xFF251F15), fontSize = 8.sp)
                        }
                        Text(task.first, modifier = Modifier.weight(1f).padding(start = 6.dp), color = if (task.second) Color(0xFF827764) else Color(0xFFD7CBB8), fontSize = 7.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("✧", color = GoldPale, fontSize = 11.sp)
            Text("  SAMPLE LIST · STORED ON DEVICE", color = Color(0xFF918571), fontSize = 5.5.sp, fontFamily = FontFamily.Monospace)
            Spacer(Modifier.weight(1f))
            tasks.indices.forEach { index ->
                // Long-press/delete affordances are deliberately kept out of the primary, calm checklist.
                if (index == tasks.lastIndex && tasks.size > 4) TextButton(onClick = { onDelete(index) }) { Text("REMOVE LAST", fontSize = 6.sp, color = Color(0xFFB77D70)) }
            }
        }
    }
}

@Composable
private fun SettingsContent(
    appearance: String, onAppearance: (String) -> Unit,
    timeZone: String, onTimeZone: (String) -> Unit,
    clockFormat: String, onClockFormat: (String) -> Unit,
    clockFont: String, onClockFont: (String) -> Unit,
    clockSize: Float, onClockSize: (Float) -> Unit,
    clockOpacity: Float, onClockOpacity: (Float) -> Unit,
    clockPosition: String, onClockPosition: (String) -> Unit,
    brightness: Float, onBrightness: (Float) -> Unit,
    backgroundStrength: Float, onBackgroundStrength: (Float) -> Unit,
    goldStrength: Float, onGoldStrength: (Float) -> Unit,
    chartOpacity: Float, onChartOpacity: (Float) -> Unit,
    dataMode: String, onDataMode: (String) -> Unit,
    batteryMode: String, onBatteryMode: (String) -> Unit,
    timeframe: String, onTimeframe: (String) -> Unit,
    showGold: Boolean, onShowGold: (Boolean) -> Unit,
    showPrice: Boolean, onShowPrice: (Boolean) -> Unit,
    showChange: Boolean, onShowChange: (Boolean) -> Unit,
    showHighLow: Boolean, onShowHighLow: (Boolean) -> Unit,
    showChart: Boolean, onShowChart: (Boolean) -> Unit,
    showTrend: Boolean, onShowTrend: (Boolean) -> Unit,
    showRsi: Boolean, onShowRsi: (Boolean) -> Unit,
    showVwap: Boolean, onShowVwap: (Boolean) -> Unit,
    showVolatility: Boolean, onShowVolatility: (Boolean) -> Unit,
    showCalendar: Boolean, onShowCalendar: (Boolean) -> Unit,
    showSchedule: Boolean, onShowSchedule: (Boolean) -> Unit,
    showYear: Boolean, onShowYear: (Boolean) -> Unit,
    showTasks: Boolean, onShowTasks: (Boolean) -> Unit,
    showSessions: Boolean, onShowSessions: (Boolean) -> Unit,
    onClose: () -> Unit,
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp, vertical = 8.dp)) {
        Eyebrow("GOLD OS · PERSONALISE")
        Text("Theme settings", color = Color(0xFFF2EADB), fontSize = 23.sp, fontFamily = FontFamily.Serif)
        Spacer(Modifier.height(12.dp))
        SettingsHeading("DISPLAY")
        ChoiceSetting("Appearance", appearance, listOf("System", "Dark", "Light"), onAppearance)
        ChoiceSetting("Clock format", clockFormat, listOf("24h", "12h"), onClockFormat)
        ChoiceSetting("Clock typeface", clockFont, listOf("Editorial", "Modern", "Mono"), onClockFont)
        SliderSetting("Clock size", clockSize, 64f..104f, onClockSize)
        SliderSetting("Clock opacity", clockOpacity, .45f..1f, onClockOpacity)
        ChoiceSetting("Clock position", clockPosition, listOf("Upper", "Center", "Lower"), onClockPosition)
        ChoiceSetting("Time zone", timeZone, listOf("Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Asia/Tokyo"), onTimeZone)
        SettingsHeading("WALLPAPER")
        SliderSetting("Wallpaper brightness", brightness, .35f..1.15f, onBrightness)
        SliderSetting("Background intensity", backgroundStrength, .2f..1f, onBackgroundStrength)
        SliderSetting("Muted gold accent", goldStrength, .15f.. .9f, onGoldStrength)
        SettingsHeading("GOLD MARKET")
        ChoiceSetting("Market mode", dataMode.uppercase(), listOf("DEMO", "LIVE"), { onDataMode(it.lowercase()) })
        ChoiceSetting("Battery profile", batteryMode, listOf("saver", "balanced", "fast"), onBatteryMode)
        ChoiceSetting("Default timeframe", timeframe, listOf("1m", "5m", "15m", "1h"), onTimeframe)
        SliderSetting("Chart opacity", chartOpacity, .35f..1f, onChartOpacity)
        ToggleSetting("Gold market module", "Quote and miniature OHLC chart", showGold, onShowGold)
        ToggleSetting("Gold price", "Current XAUUSD quote", showPrice, onShowPrice)
        ToggleSetting("Daily percentage", "Provider’s session change", showChange, onShowChange)
        ToggleSetting("High / low", "Session range", showHighLow, onShowHighLow)
        ToggleSetting("Candlestick chart", "Forty compact OHLC candles", showChart, onShowChart)
        ToggleSetting("Trend", "EMA 20 / 50", showTrend, onShowTrend)
        ToggleSetting("RSI", "Fourteen-period momentum", showRsi, onShowRsi)
        ToggleSetting("VWAP", "Only when traded volume exists", showVwap, onShowVwap)
        ToggleSetting("Volatility", "Recent range vs average", showVolatility, onShowVolatility)
        ToggleSetting("Trading sessions", "Calculated for the selected zone", showSessions, onShowSessions)
        SettingsHeading("PERSONAL DASHBOARD")
        ToggleSetting("Calendar", "Monthly view", showCalendar, onShowCalendar)
        ToggleSetting("Daily schedule", "Local sample routine", showSchedule, onShowSchedule)
        ToggleSetting("Year progress", "Calculated from today", showYear, onShowYear)
        ToggleSetting("Task list", "On-device checklist", showTasks, onShowTasks)
        Text("Demo candles are simulated and always marked DEMO DATA. Live mode uses the public XAUUSD feed; closed or stale quotes are labelled. A wallpaper does not stream financial data.", color = Color(0xFFA09687), fontSize = 9.sp, modifier = Modifier.padding(vertical = 12.dp))
        Button(onClick = onClose, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2B241A), contentColor = GoldPale)) { Text("DONE") }
        Spacer(Modifier.height(25.dp))
    }
}

@Composable
private fun ChoiceSetting(title: String, selected: String, options: List<String>, onSelect: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(title, color = Color(0xFFE5D9C6), fontSize = 9.sp)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 5.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            options.forEach { option ->
                FilterChip(selected = selected.equals(option, ignoreCase = true), onClick = { onSelect(option) }, label = { Text(option, fontSize = 7.sp, maxLines = 1) })
            }
        }
    }
}

@Composable
private fun SliderSetting(title: String, value: Float, range: ClosedFloatingPointRange<Float>, onValue: (Float) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, color = Color(0xFFE5D9C6), fontSize = 9.sp)
            Text(if (title == "Clock size") "${value.toInt()} sp" else "${(value * 100).toInt()}%", color = GoldPale, fontSize = 8.sp, fontFamily = FontFamily.Monospace)
        }
        Slider(value = value.coerceIn(range), onValueChange = onValue, valueRange = range)
    }
}

@Composable
private fun ToggleSetting(title: String, supporting: String, checked: Boolean, onChecked: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, color = Color(0xFFE5D9C6), fontSize = 9.sp)
            Text(supporting, color = Color(0xFF968B7B), fontSize = 7.sp)
        }
        Switch(checked = checked, onCheckedChange = onChecked, modifier = Modifier.size(width = 38.dp, height = 24.dp))
    }
}

@Composable
private fun SettingsHeading(title: String) {
    Text(title, color = Color(0xFFB59C70), fontSize = 7.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.5.sp, modifier = Modifier.padding(top = 15.dp, bottom = 5.dp))
}

@Composable
private fun GlassPanel(modifier: Modifier = Modifier, goldBorder: Boolean = false, goldStrength: Float = .55f, panelPadding: Dp = 12.dp, content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    Column(
        modifier = modifier
            .shadow(12.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xB51A1713))
            .border(1.dp, if (goldBorder) GoldAccent.copy(alpha = .55f * goldStrength) else Color(0x23E1D3BD), RoundedCornerShape(16.dp))
            .padding(panelPadding),
        content = content,
    )
}

@Composable
private fun Eyebrow(text: String) {
    Text(text, color = Color(0xFFA09687), fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = 1.sp, maxLines = 1)
}

@Composable
private fun StatusBadge(status: String) {
    val color = when (status) { "LIVE" -> QuietGreen; "DATA DELAYED", "UNAVAILABLE" -> QuietRed; else -> GoldPale }
    Row(Modifier.clip(RoundedCornerShape(18.dp)).background(color.copy(alpha = .11f)).border(1.dp, color.copy(alpha = .3f), RoundedCornerShape(18.dp)).padding(horizontal = 7.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(4.dp).background(color, CircleShape))
        Text("  $status", color = color, fontSize = 6.sp, fontFamily = FontFamily.Monospace, letterSpacing = .5.sp)
    }
}

@Composable
private fun IndicatorCell(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, color = Color(0xFF827764), fontSize = 5.sp, fontFamily = FontFamily.Monospace, letterSpacing = .5.sp, maxLines = 1)
        Text(value, color = color, fontSize = 7.sp, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun changeColor(change: Double?): Color = when { change == null -> Color(0xFFA09687); change > 0 -> QuietGreen; change < 0 -> QuietRed; else -> Color(0xFFA09687) }

private fun vwapRead(snapshot: GoldSnapshot?): String {
    val price = snapshot?.price ?: return "N/A"
    val vwap = snapshot.vwap ?: return "N/A"
    return if (price >= vwap) "ABOVE" else "BELOW"
}
private fun ageText(age: Long, demo: Boolean): String = if (demo) "Updated ${if (age < 8) "just now" else "${age}s ago"} · DEMO" else when {
    age < 60 -> "Updated ${age}s ago"
    age < 3600 -> "Updated ${age / 60}m ago"
    else -> "Updated ${age / 3600}h ago"
}
private fun formatCandleTime(time: Long, timeZone: String): String = runCatching {
    Instant.ofEpochMilli(time).atZone(ZoneId.of(timeZone)).format(DateTimeFormatter.ofPattern("HH:mm"))
}.getOrDefault("—")
private fun greeting(hour: Int): String = when { hour < 12 -> "GOOD MORNING"; hour < 17 -> "GOOD AFTERNOON"; else -> "GOOD EVENING" }

private fun showSessionsLabel(now: Long, zone: ZoneId): String {
    val instant = Instant.ofEpochMilli(now)
    val local = instant.atZone(zone)
    val utcDay = instant.atZone(ZoneId.of("UTC")).dayOfWeek.value
    if (utcDay == 6 || utcDay == 7) return "MARKET QUIET"
    val localMinute = local.hour * 60 + local.minute
    val utcMinute = instant.atZone(ZoneId.of("UTC")).hour * 60 + instant.atZone(ZoneId.of("UTC")).minute
    val offset = (localMinute - utcMinute + 1440) % 1440
    val sessions = listOf("ASIA" to (0 to 540), "LONDON" to (420 to 960), "NEW YORK" to (720 to 1260))
    val active = sessions.filter { (_, window) ->
        val start = (window.first + offset) % 1440
        val end = (window.second + offset) % 1440
        if (start < end) localMinute in start until end else localMinute >= start || localMinute < end
    }.map { it.first }
    return active.joinToString(" + ").ifBlank { "MARKET QUIET" }
}
