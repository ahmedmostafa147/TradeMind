import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// The published site, which hosts the two legal documents Play requires.
///
/// Hard-coded rather than read from config: it is the same constant
/// `site/lib/site.ts` carries, and there is no build-time environment on the
/// phone to read it from. If the domain changes, it changes in both files.
const String kSiteUrl = 'https://radar-one-phi.vercel.app';

const String kContactEmail = 'ahmed14mostafa17@gmail.com';

/// **The exact sentence from `site/lib/site.ts`.** Any edit here has to be made
/// there in the same commit — see CLAUDE.md §3.
const String kDisclaimer =
    'رادار أداة لتسجيل الصفقات وحساب المخاطرة، ولعرض بيانات تداولات منشورة من '
    'البورصة المصرية. هو لا يقدّم نصائح أو توصيات استثمارية، ولا ينفّذ أي '
    'عمليات بيع أو شراء، ولا يتصل بأي وسيط أو حساب تداول. كل القرارات '
    'مسؤوليتك وحدك.';

/// «تنويه» and the legal documents, inside الإعدادات.
///
/// THE APP HAD NONE OF THIS. Not the disclaimer, not a link to the privacy
/// policy, not the terms — nothing, anywhere in the UI. Meanwhile the website
/// carries the same sentence on every marketing page and in its own settings
/// tab. `RELEASE.md` requires the "not investment advice" line stated outright
/// so Play does not file the app under its restricted financial categories,
/// and a finance app whose website says it while the app itself does not is an
/// inconsistency a reviewer can see.
class LegalTiles extends StatelessWidget {
  const LegalTiles({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          // Text.rich, not RichText: it is still a Text widget, so the
          // disclaimer is findable by its words in a test and readable by a
          // screen reader as one paragraph.
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'تنويه: ',
                  style: theme.textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const TextSpan(text: kDisclaimer),
              ],
            ),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.6,
            ),
          ),
        ),
        const _LegalLink(
          label: 'سياسة الخصوصية',
          icon: Icons.privacy_tip_outlined,
          path: '/privacy',
        ),
        const _LegalLink(
          label: 'شروط الاستخدام',
          icon: Icons.gavel_rounded,
          path: '/terms',
        ),
        const _LegalLink(
          label: 'تواصل معنا',
          icon: Icons.mail_outline_rounded,
          path: null,
        ),
      ],
    );
  }
}

class _LegalLink extends StatelessWidget {
  final String label;
  final IconData icon;

  /// Null opens the contact mail draft instead of a page.
  final String? path;

  const _LegalLink({
    required this.label,
    required this.icon,
    required this.path,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(label),
      trailing: const Icon(Icons.open_in_new_rounded, size: 18),
      onTap: () async {
        final uri = path == null
            ? Uri.parse('mailto:$kContactEmail')
            : Uri.parse('$kSiteUrl$path');

        final opened = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        ).catchError((_) => false);

        // Says so rather than doing nothing. A device with no browser or no
        // mail client is rare but real, and a tile that silently ignores a tap
        // reads as broken.
        if (opened || !context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('مش قادرين نفتح $uri')),
        );
      },
    );
  }
}
