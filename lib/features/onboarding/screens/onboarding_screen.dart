import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/onboarding_providers.dart';

/// One slide of the intro.
///
/// Four of them, and no more: an intro is a cost the user pays before reaching
/// the thing they installed, and every slide past the fourth is paid by
/// everyone to be read by nobody.
class _Slide {
  final IconData icon;
  final String title;
  final String body;

  const _Slide({required this.icon, required this.title, required this.body});
}

/// The slides say what the app DOES, not what it believes.
///
/// Each one names a concrete mechanic the user will meet within a minute of
/// finishing — the size calculator, the written reason, the discipline score —
/// so the tour is a map of the product rather than a sales pitch for something
/// they have already installed.
const _slides = <_Slide>[
  _Slide(
    icon: Icons.help_outline_rounded,
    title: 'فاكر اشتريت السهم ده ليه؟',
    body:
        'أغلب الخسائر مش سببها صفقة وحشة، سببها إنك مش فاكر ليه دخلت أصلًا. '
        'رادار بيخلّي لكل صفقة سبب مكتوب ترجعله بعد شهور.',
  ),
  _Slide(
    icon: Icons.calculate_outlined,
    title: 'الحجم بيتحسب قبل ما تشتري',
    body:
        'تدخل رأس مالك وأقصى مخاطرة تقبلها، وسعر الدخول والاستوب — يطلعلك أقصى '
        'كمية مسموح بيها. وأي كمية أعلى بتتعلّم بالأحمر وانت بتكتب.',
  ),
  _Slide(
    icon: Icons.speed_rounded,
    title: 'درجة بتقيس التزامك، مش حظك',
    body:
        'كل صفقة بتاخد من 0 لـ 100 على خمس نقاط. صفقة خسرانة اتعملت بالأصول '
        'بتاخد 100، وصفقة كسبانة اتاخدت بمزاج بتاخد 20 — الدرجة بتقيس الشغل '
        'اللي انت بتتحكم فيه.',
  ),
  _Slide(
    icon: Icons.insights_rounded,
    title: 'وبعد شهور، تعرف غلطت فين',
    body:
        'التوقّع الرياضي، معامل الربح، أداءك حسب نوع الصفقة ومصدرها، وأحسن '
        'وأوحش يوم وشهر. أرقام بتجاوب على أسئلة، مش بتزيّن الشاشة.',
  ),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _index = 0;
  bool _finishing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool get _isLast => _index == _slides.length - 1;

  Future<void> _finish() async {
    // Guarded: markSeen is async, and a double tap on «يلا نبدأ» would
    // otherwise fire two writes and two rebuilds.
    if (_finishing) return;
    setState(() => _finishing = true);
    await ref.read(onboardingSeenProvider.notifier).markSeen();
  }

  void _next() {
    if (_isLast) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // «تخطّي» disappears on the last slide, where the primary button
            // already does the same thing — two controls for one action on the
            // same screen is a choice the user has no way to make.
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: AnimatedOpacity(
                opacity: _isLast ? 0 : 1,
                duration: const Duration(milliseconds: 180),
                child: TextButton(
                  onPressed: _isLast || _finishing ? null : _finish,
                  child: const Text('تخطّي'),
                ),
              ),
            ),

            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (value) => setState(() => _index = value),
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            // Brand as a FILL with onBrand on top — it is a
                            // background colour in this palette (1.15:1 on
                            // white) and would be unreadable as ink.
                            color: theme.colorScheme.primaryContainer,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            slide.icon,
                            size: 44,
                            color: theme.colorScheme.onPrimaryContainer,
                          ),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          slide.body,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                            height: 1.7,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 28),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      final active = i == _index;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        height: 6,
                        width: active ? 22 : 6,
                        decoration: BoxDecoration(
                          color: active
                              ? theme.colorScheme.primary
                              : theme.colorScheme.outlineVariant,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _finishing ? null : _next,
                      child: Text(_isLast ? 'يلا نبدأ' : 'التالي'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
