import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectAvatar, useUploadCustomAvatar, useUnlinkPlatform, useUpdateProfile, useUploadBanner } from '../api/user';
import style from './settingsPage.module.scss';

function SettingsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);
  const [description, setDescription] = useState(user.description ?? '');
  const selectAvatar = useSelectAvatar();
  const uploadAvatar = useUploadCustomAvatar();
  const unlinkPlatform = useUnlinkPlatform();
  const updateProfile = useUpdateProfile();
  const uploadBanner = useUploadBanner();

  const githubOption = user.avatar_options.find(o => o.source === 'github');
  const steamOption = user.avatar_options.find(o => o.source === 'steam');
  const hasSteam = user.linked_platforms.includes('steam');

  const activeSource =
    user.avatar_options.find(o => o.url === user.avatar_url)?.source ??
    (user.avatar_url ? 'custom' : null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAvatar.mutate(file);
    e.target.value = '';
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadBanner.mutate(file);
    e.target.value = '';
  }

  const isAvatarBusy = selectAvatar.isPending || uploadAvatar.isPending;

  return (
    <div className={style.page}>
      <h2 className={style.pageTitle}>Settings</h2>


      {/* ── Profile Picture ─────────────────────────────────────── */}
      <section className={style.section}>
        <h3 className={style.sectionTitle}>Profile Picture</h3>

        <div className={style.avatarRow}>
          <div className={style.currentAvatar}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className={style.avatarImg} />
            ) : (
              <span className={style.avatarInitial}>{user.username[0].toUpperCase()}</span>
            )}
            {isAvatarBusy && <div className={style.avatarOverlay}>…</div>}
          </div>

          <div className={style.avatarOptions}>
            {githubOption && (
              <button
                className={`${style.avatarOption} ${activeSource === 'github' ? style.avatarOptionActive : ''}`}
                onClick={() => selectAvatar.mutate('github')}
                disabled={isAvatarBusy}
              >
                <img src={githubOption.url} alt="GitHub" className={style.optionThumb} />
                <span>GitHub</span>
                {activeSource === 'github' && <span className={style.activeDot} />}
              </button>
            )}

            {steamOption && (
              <button
                className={`${style.avatarOption} ${activeSource === 'steam' ? style.avatarOptionActive : ''}`}
                onClick={() => selectAvatar.mutate('steam')}
                disabled={isAvatarBusy}
              >
                <img src={steamOption.url} alt="Steam" className={style.optionThumb} />
                <span>Steam</span>
                {activeSource === 'steam' && <span className={style.activeDot} />}
              </button>
            )}

            <button
              className={`${style.avatarOption} ${activeSource === 'custom' ? style.avatarOptionActive : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isAvatarBusy}
            >
              <span className={style.uploadIcon}>↑</span>
              <span>Custom</span>
              {activeSource === 'custom' && <span className={style.activeDot} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              hidden
            />
          </div>
        </div>

        {uploadAvatar.isError && (
          <p className={style.errorMsg}>Upload failed. Please try again.</p>
        )}
      </section>

      {/* ── Connected Platforms ─────────────────────────────────── */}
      <section className={style.section}>
        <h3 className={style.sectionTitle}>Connected Platforms</h3>

        <div className={style.platformRow}>
          <div className={style.platformInfo}>
            <svg className={style.steamIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.905c0 .051.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
            </svg>
            <div>
              <p className={style.platformName}>Steam</p>
              <p className={style.platformSub}>
                {hasSteam ? 'Account linked' : 'Not connected'}
              </p>
            </div>
          </div>

          {hasSteam ? (
            <div className={style.connectedActions}>
              <span className={style.connectedBadge}>✓ Connected</span>
              {confirmUnlink === 'steam' ? (
                <div className={style.confirmRow}>
                  <span className={style.confirmLabel}>Disconnect?</span>
                  <button
                    className={style.confirmYes}
                    disabled={unlinkPlatform.isPending}
                    onClick={() => unlinkPlatform.mutate('steam', { onSuccess: () => setConfirmUnlink(null) })}
                  >
                    Yes
                  </button>
                  <button className={style.confirmNo} onClick={() => setConfirmUnlink(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={style.disconnectBtn} onClick={() => setConfirmUnlink('steam')}>
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <a href="/api/user/steam/link" className={style.connectBtn}>
              Connect Steam
            </a>
          )}
        </div>
      </section>
      {/* ── Profile ─────────────────────────────────────────────── */}
      <section className={style.section}>
        <h3 className={style.sectionTitle}>Profile</h3>

        <div className={style.bannerRow}>
          <div
            className={style.bannerPreview}
            style={user.banner_url ? { backgroundImage: `url(${user.banner_url})` } : undefined}
          >
            {!user.banner_url && <span className={style.bannerPlaceholder}>No banner set</span>}
            {uploadBanner.isPending && <div className={style.bannerOverlay}>Uploading…</div>}
          </div>
          <button
            type="button"
            className={style.uploadBannerBtn}
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadBanner.isPending}
          >
            {user.banner_url ? 'Change Banner' : 'Upload Banner'}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBannerChange}
            hidden
          />
        </div>
        {uploadBanner.isError && (
          <p className={style.errorMsg}>Banner upload failed. Please try again.</p>
        )}

        <div className={style.descriptionRow}>
          <label className={style.descriptionLabel} htmlFor="profile-description">
            Description
          </label>
          <textarea
            id="profile-description"
            className={style.descriptionTextarea}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell people a bit about yourself…"
            maxLength={1000}
            rows={4}
          />
          <div className={style.descriptionFooter}>
            <span className={style.charCount}>{description.length} / 1000</span>
            <button
              type="button"
              className={style.saveBtn}
              onClick={() => updateProfile.mutate(description || null)}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
          {updateProfile.isSuccess && (
            <p className={style.successMsg}>Saved!</p>
          )}
          {updateProfile.isError && (
            <p className={style.errorMsg}>Failed to save. Please try again.</p>
          )}
        </div>
      </section>
    </div>
    
  );
  
}

export default SettingsPage;
